import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

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
    const { email, name, role, organizationId, avatarUrl } = body

    console.log("[create-member] Request body:", { email, name, role, organizationId })

    if (!email || !name || !role || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, role, organizationId" },
        { status: 400 },
      )
    }

    // Ensure role is 'member' (not 'admin') when creating from admin panel
    const finalRole = role === "member" ? "member" : "member"
    console.log("[create-member] Final role to use:", finalRole)

    // If user is admin (not superadmin), verify they can only create members in their own organization
    if (profile.role === "admin" && profile.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Forbidden: Admins can only create members in their own organization" },
        { status: 403 },
      )
    }

    // Verify that admins can only create members (not other admins)
    if (profile.role === "admin" && role === "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins can only create members, not other admins" },
        { status: 403 },
      )
    }

    // Use service role client to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not configured")
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

    // Generate invitation link
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback?invite=true&org=${organizationId}`
    
    // Use inviteUserByEmail instead of createUser to automatically send invitation email
    // Note: The 'data' field goes to user_metadata, but the trigger reads from raw_user_meta_data
    // We need to ensure the role is explicitly set in the profile after creation
    console.log("[create-member] Inviting user with role:", finalRole)
    console.log("[create-member] Inviting user with metadata:", { name, role: finalRole, organization_id: organizationId })
    const { data: inviteData, error: inviteError } = await serviceRoleClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          name,
          role: finalRole, // Use finalRole to ensure it's 'member'
          organization_id: organizationId,
        },
        redirectTo,
      },
    )
    
    if (inviteData?.user) {
      console.log("[create-member] User created, checking raw_user_meta_data:", inviteData.user.user_metadata)
      // Also check if we can read the user's metadata directly
      const { data: userData } = await serviceRoleClient.auth.admin.getUserById(inviteData.user.id)
      console.log("[create-member] User metadata from getUserById:", userData?.user?.user_metadata)
      console.log("[create-member] User raw_user_meta_data from getUserById:", userData?.user?.raw_user_meta_data)
    }

    if (inviteError) {
      console.error("Error inviting user:", inviteError)
      
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
                status: "pending", // Ensure new invited users are pending approval
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
        { error: "Failed to create user", message: inviteError.message },
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
        console.log(`[create-member] Profile not found yet, retrying... (attempt ${retries + 1})`)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      retries++
    }

    let newProfile

    if (existingProfile) {
      console.log("[create-member] Profile exists, updating with organization_id:", organizationId)
      console.log("[create-member] Current profile:", { id: existingProfile.id, organization_id: existingProfile.organization_id, role: existingProfile.role })
      console.log("[create-member] Updating with role:", finalRole, "organizationId:", organizationId)
      
      // Update existing profile with correct data - ensure role is set correctly
      // Preserve status 'pending' for new users, or set it if not set
      const currentStatus = existingProfile.status || "pending"
      const statusToSet = currentStatus === "approved" ? currentStatus : "pending"
      
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
        console.error("[create-member] Error updating profile:", updateError)
        // Try to clean up auth user if profile update fails
        await serviceRoleClient.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: "Failed to update profile", message: updateError.message },
          { status: 500 },
        )
      }

      console.log("[create-member] Profile updated successfully:", { 
        id: updatedProfile.id, 
        email: updatedProfile.email, 
        organization_id: updatedProfile.organization_id,
        role: updatedProfile.role 
      })
      
      // Re-read the profile to ensure we have the latest data
      const { data: reReadProfile } = await serviceRoleClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()
      
      console.log("[create-member] Re-read profile after update:", { 
        id: reReadProfile?.id, 
        role: reReadProfile?.role,
        organization_id: reReadProfile?.organization_id 
      })
      
      // Verify the role was updated correctly - retry up to 3 times if needed
      let profileToUse = reReadProfile || updatedProfile
      let retryCount = 0
      while (profileToUse.role !== finalRole && retryCount < 3) {
        console.warn(`[create-member] WARNING: Role mismatch! Expected '${finalRole}' but got '${profileToUse.role}'. Retrying update... (attempt ${retryCount + 1})`)
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 300))
        
        // Retry the update
        const { data: retryProfile, error: retryError } = await serviceRoleClient
          .from("profiles")
          .update({ role: finalRole })
          .eq("id", userId)
          .select()
          .single()
        
        if (retryError) {
          console.error("[create-member] Error retrying role update:", retryError)
          break
        } else {
          console.log("[create-member] Role after retry:", retryProfile.role)
          profileToUse = retryProfile
        }
        retryCount++
      }
      
      // Final verification
      if (profileToUse.role !== finalRole) {
        console.error(`[create-member] CRITICAL: Failed to set role to '${finalRole}' after ${retryCount} attempts. Final role: '${profileToUse.role}'`)
      } else {
        console.log(`[create-member] SUCCESS: Role correctly set to '${finalRole}'`)
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
          status: "pending", // New users must be approved by admin
          organization_id: organizationId,
          avatar_url: avatarUrl || null,
        })
        .select()
        .single()

      if (insertError) {
        console.error("Error creating profile:", insertError)
        // Try to clean up auth user if profile creation fails
        await serviceRoleClient.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: "Failed to create profile", message: insertError.message },
          { status: 500 },
        )
      }

      console.log("[create-member] Profile created successfully:", { 
        id: createdProfile.id, 
        email: createdProfile.email, 
        organization_id: createdProfile.organization_id,
        role: createdProfile.role 
      })
      
      // Verify the role was set correctly - retry up to 3 times if needed
      let profileToUse = createdProfile
      let retryCount = 0
      while (profileToUse.role !== finalRole && retryCount < 3) {
        console.warn(`[create-member] WARNING: Role mismatch on creation! Expected '${finalRole}' but got '${profileToUse.role}'. Updating... (attempt ${retryCount + 1})`)
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 300))
        
        const { data: fixedProfile, error: fixError } = await serviceRoleClient
          .from("profiles")
          .update({ role: finalRole })
          .eq("id", userId)
          .select()
          .single()
        
        if (fixError) {
          console.error("[create-member] Error fixing role:", fixError)
          break
        } else {
          console.log("[create-member] Role after fix attempt:", fixedProfile.role)
          profileToUse = fixedProfile
        }
        retryCount++
      }
      
      // Final verification
      if (profileToUse.role !== finalRole) {
        console.error(`[create-member] CRITICAL: Failed to set role to '${finalRole}' after ${retryCount} attempts. Final role: '${profileToUse.role}'`)
      } else {
        console.log(`[create-member] SUCCESS: Role correctly set to '${finalRole}'`)
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
      console.error(`[create-member] FINAL CHECK FAILED: Profile role is '${finalProfileCheck.role}' but should be '${finalRole}'. Attempting one final update...`)
      const { error: finalUpdateError } = await serviceRoleClient
        .from("profiles")
        .update({ role: finalRole })
        .eq("id", newProfile.id)
      
      if (finalUpdateError) {
        console.error("[create-member] Error in final role update:", finalUpdateError)
      } else {
        console.log("[create-member] Final role update successful")
        // Update newProfile to reflect the correct role
        newProfile = { ...newProfile, role: finalRole }
      }
    }

    console.log("[create-member] Returning profile with role:", newProfile.role)
    
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
    })
  } catch (error) {
    console.error("Error creating member:", error)
    return NextResponse.json(
      {
        error: "Failed to create member",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

