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
    const { email, name, role, organizationId, avatarUrl, entityIds, isInvitation } = body

    console.log("[create-member] Request body:", { email, name, role, organizationId, entityIds, isInvitation })

    if (!email || !name || !role || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, role, organizationId" },
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
    
    console.log("[create-member] Final role to use:", finalRole, "Requested role:", role, "Requester role:", profile.role)

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

    // Generate invitation link - redirect to password setup page for new users
    // IMPORTANT: This URL must be in the Redirect URLs list in Supabase Dashboard
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const redirectTo = `${baseUrl}/auth/update-password?invite=true&org=${organizationId}`
    
    console.log("[create-member] Redirect URL configured:", {
      baseUrl,
      redirectTo,
      hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    })
    
    // First, check if user already exists
    let existingUser = null
    try {
      const { data: users } = await serviceRoleClient.auth.admin.listUsers()
      existingUser = users.users.find((u) => u.email === email)
    } catch (err) {
      console.log("[create-member] Could not list users, will proceed with invitation")
    }

    let inviteData: any = null
    let inviteError: any = null

    if (existingUser) {
      // User exists, generate an invite link (longer expiration than recovery)
      console.log("[create-member] User already exists, generating invite link")
      console.log("[create-member] Link generation params:", {
        type: "invite",
        email,
        redirectTo,
        timestamp: new Date().toISOString(),
      })
      
      const { data: linkData, error: linkErr } = await serviceRoleClient.auth.admin.generateLink({
        type: "invite",
        email: email,
        options: {
          redirectTo,
          data: {
            name,
            role: finalRole,
            organization_id: organizationId,
          },
        },
      })
      
      if (linkErr) {
        console.error("[create-member] Error generating invite link:", linkErr)
        inviteError = linkErr
      } else {
        const actionLink = linkData?.properties?.action_link
        console.log("[create-member] Invite link generated successfully:", {
          linkType: "invite",
          linkUrl: actionLink,
          hashedToken: actionLink ? new URL(actionLink).searchParams.get("token")?.substring(0, 20) + "..." : "N/A",
          redirectTo,
          timestamp: new Date().toISOString(),
          properties: linkData?.properties ? Object.keys(linkData.properties) : [],
        })
        
        // Create a mock response structure for existing users
        inviteData = {
          user: existingUser,
          properties: linkData?.properties,
        }
      }
    } else {
      // User doesn't exist
      if (isInvitation) {
        // For invitations, use inviteUserByEmail which automatically sends the email
        console.log("[create-member] Sending invitation email via inviteUserByEmail")
        console.log("[create-member] Invitation parameters:", {
          email,
          redirectTo,
          organizationId,
          finalRole,
          timestamp: new Date().toISOString(),
        })
        
        const { data: inviteResult, error: inviteErr } = await serviceRoleClient.auth.admin.inviteUserByEmail(
          email,
          {
            data: {
              name,
              role: finalRole,
              organization_id: organizationId,
            },
            redirectTo: redirectTo, // Explicitly set redirectTo
          },
        )

        if (inviteErr) {
          console.error("[create-member] Error sending invitation:", inviteErr)
          inviteError = inviteErr
        } else if (inviteResult?.user) {
          console.log("[create-member] Invitation email sent successfully:", {
            userId: inviteResult.user.id,
            email: inviteResult.user.email,
            timestamp: new Date().toISOString(),
          })
          inviteData = {
            user: inviteResult.user,
          }
        }
      } else {
        // For non-invitations, create user first then generate invite link
        console.log("[create-member] Creating new user and generating invite link")
        
        // Create the user first
        const { data: newUser, error: createError } = await serviceRoleClient.auth.admin.createUser({
          email,
          email_confirm: false, // User needs to confirm via invitation
          user_metadata: {
            name,
            role: finalRole,
            organization_id: organizationId,
          },
        })

        if (createError) {
          console.error("[create-member] Error creating user:", createError)
          inviteError = createError
        } else if (newUser.user) {
          // Generate invitation link for the new user
          console.log("[create-member] Generating invite link for new user")
          console.log("[create-member] Link generation params:", {
            type: "invite",
            email,
            redirectTo,
            userId: newUser.user.id,
            timestamp: new Date().toISOString(),
          })
          
          const { data: linkData, error: linkErr } = await serviceRoleClient.auth.admin.generateLink({
            type: "invite",
            email: email,
            options: {
              redirectTo,
              data: {
                name,
                role: finalRole,
                organization_id: organizationId,
              },
            },
          })

          if (linkErr) {
            console.error("[create-member] Error generating invite link:", linkErr)
            inviteError = linkErr
          } else {
            const actionLink = linkData?.properties?.action_link
            console.log("[create-member] Invite link generated successfully:", {
              linkType: "invite",
              linkUrl: actionLink,
              hashedToken: actionLink ? new URL(actionLink).searchParams.get("token")?.substring(0, 20) + "..." : "N/A",
              redirectTo,
              timestamp: new Date().toISOString(),
              properties: linkData?.properties ? Object.keys(linkData.properties) : [],
              userId: newUser.user.id,
            })
            
            inviteData = {
              user: newUser.user,
              properties: linkData?.properties,
            }
          }
        }
      }
    }
    
    if (inviteData?.user) {
      console.log("[create-member] User created, checking user_metadata:", inviteData.user.user_metadata)
      // Also check if we can read the user's metadata directly
      const { data: userData } = await serviceRoleClient.auth.admin.getUserById(inviteData.user.id)
      console.log("[create-member] User metadata from getUserById:", userData?.user?.user_metadata)
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
              console.log("[create-member] Associating entities to existing member:", { memberId: newProfile.id, entityIds })
              
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
                console.error("[create-member] Error associating entities:", assignError)
              } else {
                console.log("[create-member] Successfully associated entities to existing member")
              }
            } catch (err) {
              console.error("[create-member] Error in entity association:", err)
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
          status: isInvitation ? "approved" : "pending", // Invitations are approved, others need approval
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
    
    // Associate entities if provided
    if (entityIds && entityIds.length > 0) {
      try {
        console.log("[create-member] Associating entities to member:", { memberId: newProfile.id, entityIds })
        
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
            console.error("[create-member] Error associating entities:", assignError)
            // Don't fail the request, just log the error
          } else {
            console.log("[create-member] Successfully associated entities to member")
          }
        }
      } catch (err) {
        console.error("[create-member] Error in entity association:", err)
        // Don't fail the request, just log the error
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

