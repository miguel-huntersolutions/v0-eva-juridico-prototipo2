import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

/**
 * PUT /api/update-member
 * Updates a member profile using service role to bypass RLS
 */
export async function PUT(request: NextRequest) {
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
        { error: "Forbidden: Only superadmins and admins can update members" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { memberId, name, role, avatarUrl } = body

    if (!memberId) {
      return NextResponse.json(
        { error: "Missing required field: memberId" },
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

    // Get member details to verify organization
    const { data: memberProfile, error: memberError } = await serviceRoleClient
      .from("profiles")
      .select("id, email, name, role, organization_id")
      .eq("id", memberId)
      .single()

    if (memberError || !memberProfile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // If user is admin (not superadmin), verify they can only update members in their own organization
    if (profile.role === "admin" && profile.organization_id !== memberProfile.organization_id) {
      return NextResponse.json(
        { error: "Forbidden: Admins can only update members in their own organization" },
        { status: 403 },
      )
    }

    // Verify that admins can only update members (not change roles to admin)
    if (profile.role === "admin" && role && role === "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins can only update members, not change roles to admin" },
        { status: 403 },
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      )
    }

    // Update the profile
    const { data: updatedProfile, error: updateError } = await serviceRoleClient
      .from("profiles")
      .update(updateData)
      .eq("id", memberId)
      .select()
      .single()

    if (updateError) {
      console.error("[update-member] Error updating profile:", updateError)
      return NextResponse.json(
        { error: "Failed to update member", message: updateError.message },
        { status: 500 },
      )
    }

    console.log("[update-member] Profile updated successfully:", { id: updatedProfile.id, name: updatedProfile.name })

    return NextResponse.json({
      success: true,
      profile: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        role: updatedProfile.role,
        organizationId: updatedProfile.organization_id,
        avatarUrl: updatedProfile.avatar_url,
      },
    })
  } catch (error) {
    console.error("Error updating member:", error)
    return NextResponse.json(
      {
        error: "Failed to update member",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

