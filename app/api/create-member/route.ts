import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { getAppUrl } from "@/lib/app-config"

/**
 * POST /api/create-member
 * Creates a new member (user + profile) using service role to bypass RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is superadmin or admin
    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (!profile || (profile.role !== "superadmin" && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: Only superadmins and admins can create members" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { name, role, organizationId, avatarUrl, entityIds, isInvitation } = body
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!email || !name || !role || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, role, organizationId" },
        { status: 400 },
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email", message: `El correo "${email}" no tiene un formato válido` },
        { status: 400 },
      )
    }

    // Determine final role based on requester's permissions
    // Superadmins can create admins or members, admins can only create members
    let finalRole: "admin" | "member" = "member"
    
    if (profile.role === "superadmin") {
      // Superadmins can create admins or members
      finalRole = role === "admin" ? "admin" : "member"
    } else if (profile.role === "admin") {
      // Admins can only create members (not other admins)
      if (role === "admin") {
        return NextResponse.json(
          { error: "Forbidden: Admins can only create members, not other admins" },
          { status: 403 },
        )
      }
      finalRole = "member"
    }

    // If user is admin (not superadmin), verify they can only create members in their own organization
    if (profile.role === "admin" && profile.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Forbidden: Admins can only create members in their own organization" },
        { status: 403 },
      )
    }

    // Use service role client to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error: Service role key not configured" },
        { status: 500 },
      )
    }

    const serviceRoleClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Generate invitation link - redirect to password setup page for new users
    // IMPORTANT: This URL must be in the Redirect URLs list in Supabase Dashboard
    const baseUrl = getAppUrl()
    const redirectTo = `${baseUrl}/auth/update-password?invite=true&org=${organizationId}`
    
    const userMetadata = {
      name,
      role: finalRole,
      organization_id: organizationId,
    }

    // First, check if user already exists
    let existingUser = null
    try {
      const { data: users } = await serviceRoleClient.auth.admin.listUsers()
      existingUser = users.users.find((u) => u.email?.toLowerCase() === email)
    } catch {
      // Will proceed with invitation
    }

    let inviteData: any = null
    let inviteError: any = null
    let inviteLink: string | null = null
    let emailSent = false

    if (existingUser) {
      const { data: linkData, error: linkErr } = await serviceRoleClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          redirectTo,
          data: userMetadata,
        },
      })
      
      if (linkErr) {
        console.error("[create-member] Error generating invite link:", linkErr)
        inviteError = linkErr
      } else {
        inviteLink = linkData?.properties?.action_link ?? null
        inviteData = {
          user: existingUser,
          properties: linkData?.properties,
        }
      }
    } else {
      // Prefer inviteUserByEmail so Supabase sends the invite email when SMTP is configured.
      const { data: inviteResult, error: inviteErr } = await serviceRoleClient.auth.admin.inviteUserByEmail(
        email,
        {
          data: userMetadata,
          redirectTo,
        },
      )

      if (inviteErr) {
        // Without custom SMTP, Supabase rejects invites to external addresses
        // (often as "Email address is invalid" / not_authorized). Fall back to
        // createUser + generateLink so the member can still be created.
        const msg = (inviteErr.message || "").toLowerCase()
        const canFallback =
          msg.includes("invalid") ||
          msg.includes("not authorized") ||
          msg.includes("not_authorized") ||
          msg.includes("error sending") ||
          msg.includes("smtp")

        if (canFallback) {
          console.warn(
            "[create-member] inviteUserByEmail failed, falling back to createUser+generateLink:",
            inviteErr.message,
          )

          const { data: created, error: createErr } = await serviceRoleClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: userMetadata,
          })

          let fallbackUser = created?.user ?? null

          if (createErr) {
            const createMsg = (createErr.message || "").toLowerCase()
            if (createMsg.includes("already") || createMsg.includes("registered") || createMsg.includes("exists")) {
              try {
                const { data: users } = await serviceRoleClient.auth.admin.listUsers()
                fallbackUser = users.users.find((u) => u.email?.toLowerCase() === email) ?? null
              } catch {
                fallbackUser = null
              }
            }

            if (!fallbackUser) {
              inviteError = createErr
            }
          }

          if (fallbackUser) {
            const { data: linkData, error: linkErr } = await serviceRoleClient.auth.admin.generateLink({
              type: "invite",
              email,
              options: {
                redirectTo,
                data: userMetadata,
              },
            })

            if (linkErr) {
              console.error("[create-member] Fallback generateLink failed:", linkErr)
            }

            inviteLink = linkData?.properties?.action_link ?? null
            inviteData = {
              user: fallbackUser,
              properties: linkData?.properties,
            }
            emailSent = false
            inviteError = null
          }
        } else {
          inviteError = inviteErr
        }
      } else if (inviteResult?.user) {
        inviteData = {
          user: inviteResult.user,
        }
        emailSent = true
      }
    }
    
    if (inviteError) {
      // If user already exists, try to get existing user
      if (inviteError.message?.includes("already registered") || inviteError.message?.includes("already exists")) {
        // Try to find existing user by email
        const { data: users } = await serviceRoleClient.auth.admin.listUsers()
        const existingUser = users.users.find((u) => u.email === email)
        
        if (existingUser) {
          // User exists, create/update profile
          const userId = existingUser.id
          
          // Wait for trigger to create profile
          await new Promise((resolve) => setTimeout(resolve, 500))
          
          // Check if profile exists
          const { data: existingProfile } = await serviceRoleClient
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single()

          let newProfile

          if (existingProfile) {
            // Update existing profile
            const { data: updatedProfile, error: updateError } = await serviceRoleClient
              .from("profiles")
              .update({
                email,
                name,
                role: finalRole, // Use finalRole to ensure it's 'member'
                status: isInvitation ? "approved" : "pending", // Invitations are approved, others need approval
                organization_id: organizationId,
                avatar_url: avatarUrl || null,
              })
              .eq("id", userId)
              .select()
              .single()

            if (updateError) {
              return NextResponse.json(
                { error: "Failed to update profile", message: updateError.message },
                { status: 500 },
              )
            }

            newProfile = updatedProfile
          } else {
            // Create profile manually
            const { data: createdProfile, error: insertError } = await serviceRoleClient
              .from("profiles")
              .insert({
                id: userId,
                email,
                name,
                role,
                organization_id: organizationId,
                avatar_url: avatarUrl || null,
              })
              .select()
              .single()

            if (insertError) {
              return NextResponse.json(
                { error: "Failed to create profile", message: insertError.message },
                { status: 500 },
              )
            }

            newProfile = createdProfile
          }

          // Associate entities if provided
          if (entityIds && entityIds.length > 0) {
            try {
              // Delete existing associations
              await serviceRoleClient.from("member_entities").delete().eq("member_id", newProfile.id)
              
              // Insert new associations
              const associations = entityIds.map((entityId: string) => ({
                member_id: newProfile.id,
                entity_id: entityId,
              }))
              
              const { error: assignError } = await serviceRoleClient
                .from("member_entities")
                .insert(associations)
              
              if (assignError) {
                // Continue
              }
            } catch {
              // Continue
            }
          }

          return NextResponse.json({
            success: true,
            profile: {
              id: newProfile.id,
              email: newProfile.email,
              name: newProfile.name,
              role: newProfile.role,
              organizationId: newProfile.organization_id,
              avatarUrl: newProfile.avatar_url,
            },
            message: "Usuario ya existía. Se actualizó el perfil. No se pudo enviar invitación porque el usuario ya está registrado.",
          })
        }
      }
      
      return NextResponse.json(
        {
          error: "Failed to create user",
          message:
            inviteError.message?.toLowerCase().includes("invalid") ||
            inviteError.message?.toLowerCase().includes("not authorized")
              ? `No se pudo invitar a "${email}". Si usas el SMTP por defecto de Supabase, configura un SMTP propio (Auth → SMTP) o revisa docs/supabase-smtp-config.md. Detalle: ${inviteError.message}`
              : inviteError.message,
        },
        { status: 500 },
      )
    }

    if (!inviteData.user) {
      return NextResponse.json({ error: "Failed to create user: No user returned" }, { status: 500 })
    }

    const userId = inviteData.user.id

    // The trigger handle_new_user() automatically creates a profile when auth user is created
    // So we need to update the existing profile instead of inserting
    // Wait a moment for the trigger to execute (increased timeout)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check if profile exists (created by trigger) - retry up to 3 times
    let existingProfile = null
    let retries = 0
    while (retries < 3 && !existingProfile) {
      const { data: profile, error: profileError } = await serviceRoleClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()
      
      if (profile && !profileError) {
        existingProfile = profile
        break
      }
      
      if (retries < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      retries++
    }

    let newProfile

    if (existingProfile) {
      // Update existing profile with correct data - ensure role is set correctly
      // For invitations, set status to 'approved', otherwise preserve or set to 'pending'
      const currentStatus = existingProfile.status || "pending"
      const statusToSet = isInvitation ? "approved" : (currentStatus === "approved" ? currentStatus : "pending")
      
      const { data: updatedProfile, error: updateError } = await serviceRoleClient
        .from("profiles")
        .update({
          email,
          name,
          role: finalRole, // Use finalRole to ensure it's 'member'
          status: statusToSet, // Preserve pending status for new users
          organization_id: organizationId,
          avatar_url: avatarUrl || null,
        })
        .eq("id", userId)
        .select()
        .single()

      if (updateError) {
        // Try to clean up auth user if profile update fails
        await serviceRoleClient.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: "Failed to update profile", message: updateError.message },
          { status: 500 },
        )
      }

      const { data: reReadProfile } = await serviceRoleClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      // Verify the role was updated correctly - retry up to 3 times if needed
      let profileToUse = reReadProfile || updatedProfile
      let retryCount = 0
      while (profileToUse.role !== finalRole && retryCount < 3) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        const { data: retryProfile, error: retryError } = await serviceRoleClient
          .from("profiles")
          .update({ role: finalRole })
          .eq("id", userId)
          .select()
          .single()
        if (retryError) break
        profileToUse = retryProfile
        retryCount++
      }
      newProfile = profileToUse
    } else {
      // Profile doesn't exist (trigger didn't fire?), create it manually
      console.log("[create-member] Profile doesn't exist, creating manually with role:", finalRole)
      const { data: createdProfile, error: insertError } = await serviceRoleClient
        .from("profiles")
        .insert({
          id: userId,
          email,
          name,
            role: finalRole, // Use finalRole to ensure it's 'member'
          status: "approved", // New users are created via invite (email sent); approved so they can log in
          organization_id: organizationId,
          avatar_url: avatarUrl || null,
        })
        .select()
        .single()

      if (insertError) {
        // Try to clean up auth user if profile creation fails
        await serviceRoleClient.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: "Failed to create profile", message: insertError.message },
          { status: 500 },
        )
      }

      let profileToUse = createdProfile
      let retryCount = 0
      while (profileToUse.role !== finalRole && retryCount < 3) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        const { data: fixedProfile, error: fixError } = await serviceRoleClient
          .from("profiles")
          .update({ role: finalRole })
          .eq("id", userId)
          .select()
          .single()
        if (fixError) break
        profileToUse = fixedProfile
        retryCount++
      }
      newProfile = profileToUse
    }

    // Final check: verify role one more time before returning
    const { data: finalProfileCheck } = await serviceRoleClient
      .from("profiles")
      .select("role")
      .eq("id", newProfile.id)
      .single()
    
    if (finalProfileCheck && finalProfileCheck.role !== finalRole) {
      const { error: finalUpdateError } = await serviceRoleClient
        .from("profiles")
        .update({ role: finalRole })
        .eq("id", newProfile.id)
      if (!finalUpdateError) {
        newProfile = { ...newProfile, role: finalRole }
      }
    }

    if (entityIds && entityIds.length > 0) {
      try {
        // Delete existing associations
        await serviceRoleClient.from("member_entities").delete().eq("member_id", newProfile.id)
        
        // Insert new associations
        if (entityIds.length > 0) {
          const associations = entityIds.map((entityId: string) => ({
            member_id: newProfile.id,
            entity_id: entityId,
          }))
          
          const { error: assignError } = await serviceRoleClient
            .from("member_entities")
            .insert(associations)
          
          if (assignError) {
            // Don't fail the request
          }
        }
      } catch {
        // Don't fail the request
      }
    }
    
    return NextResponse.json({
      success: true,
      emailSent,
      inviteLink,
      message: emailSent
        ? undefined
        : inviteLink
          ? "Usuario creado. No se pudo enviar el correo automáticamente (SMTP). Comparte el enlace de invitación manualmente."
          : "Usuario creado. No se pudo enviar el correo automáticamente; pide al usuario que use 'Olvidé mi contraseña' o reenvía la invitación.",
      profile: {
        id: newProfile.id,
        email: newProfile.email,
        name: newProfile.name,
        role: newProfile.role,
        organizationId: newProfile.organization_id,
        avatarUrl: newProfile.avatar_url,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create member",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

