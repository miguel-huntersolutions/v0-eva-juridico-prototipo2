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

    // Verify user is superadmin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Only superadmins can create members" }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, role, organizationId, avatarUrl } = body

    if (!email || !name || !role || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, role, organizationId" },
        { status: 400 },
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
    const { data: inviteData, error: inviteError } = await serviceRoleClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          name,
          role,
          organization_id: organizationId,
        },
        redirectTo,
      },
    )

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
                role,
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
    // Wait a moment for the trigger to execute
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Check if profile exists (created by trigger)
    const { data: existingProfile } = await serviceRoleClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    let newProfile

    if (existingProfile) {
      console.log("[create-member] Profile exists, updating with organization_id:", organizationId)
      // Update existing profile with correct data
      const { data: updatedProfile, error: updateError } = await serviceRoleClient
        .from("profiles")
        .update({
          email,
          name,
          role,
          organization_id: organizationId,
          avatar_url: avatarUrl || null,
        })
        .eq("id", userId)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating profile:", updateError)
        // Try to clean up auth user if profile update fails
        await serviceRoleClient.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: "Failed to update profile", message: updateError.message },
          { status: 500 },
        )
      }

      console.log("[create-member] Profile updated successfully:", updatedProfile)
      newProfile = updatedProfile
    } else {
      // Profile doesn't exist (trigger didn't fire?), create it manually
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
        console.error("Error creating profile:", insertError)
        // Try to clean up auth user if profile creation fails
        await serviceRoleClient.auth.admin.deleteUser(userId)
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

