import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/update-user-status
 * Updates the status of a user profile (pending, approved, rejected)
 * Only superadmins and admins can update user status
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
        { error: "Forbidden: Only superadmins and admins can update user status" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { userId, status, organizationId } = body

    if (!userId || !status) {
      return NextResponse.json(
        { error: "Missing required parameters: userId and status" },
        { status: 400 },
      )
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'pending', 'approved', or 'rejected'" },
        { status: 400 },
      )
    }

    // Use service role client to bypass RLS (needed to check profile even if user is pending)
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

    // Get target profile using service role (bypasses RLS)
    const { data: targetProfile, error: targetProfileError } = await serviceRoleClient
      .from("profiles")
      .select("organization_id, status")
      .eq("id", userId)
      .single()

    if (targetProfileError || !targetProfile) {
      console.error("[update-user-status] Error fetching target profile:", targetProfileError)
      return NextResponse.json(
        { error: "User profile not found", message: targetProfileError?.message || "Profile does not exist" },
        { status: 404 },
      )
    }

    // If user is admin (not superadmin), verify they can only update users in their own organization
    if (profile.role === "admin") {
      // If approving a user and providing organizationId, verify it matches admin's organization
      if (status === "approved" && organizationId) {
        if (organizationId !== profile.organization_id) {
          return NextResponse.json(
            { error: "Forbidden: Admins can only approve users for their own organization" },
            { status: 403 },
          )
        }
      } else if (targetProfile.organization_id) {
        // If user already has an organization, verify it matches admin's organization
        if (targetProfile.organization_id !== profile.organization_id) {
          return NextResponse.json(
            { error: "Forbidden: Admins can only update users in their own organization" },
            { status: 403 },
          )
        }
      }
      // If user has no organization_id and we're not approving with one, allow the update
      // (this handles cases where we're just changing status without assigning organization)
    }

    // Update the user's status
    const updateData: { status: string; organization_id?: string } = { status }
    
    // If approving and organizationId is provided, also assign the organization
    if (status === "approved" && organizationId) {
      updateData.organization_id = organizationId
    }

    const { data: updatedProfile, error: updateError } = await serviceRoleClient
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single()

    if (updateError) {
      console.error("[update-user-status] Error updating profile:", updateError)
      return NextResponse.json(
        { error: "Failed to update user status", message: updateError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    })
  } catch (error) {
    console.error("Error updating user status:", error)
    return NextResponse.json(
      {
        error: "Failed to update user status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

