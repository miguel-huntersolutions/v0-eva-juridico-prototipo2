import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

/**
 * DELETE /api/delete-member
 * Deletes a member (profile + auth user) using service role to bypass RLS
 */
export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ error: "Forbidden: Only superadmins and admins can delete members" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("memberId")

    if (!memberId) {
      return NextResponse.json({ error: "Missing required parameter: memberId" }, { status: 400 })
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

    // Get member details before deletion
    const { data: memberProfile } = await serviceRoleClient
      .from("profiles")
      .select("id, email, name, organization_id")
      .eq("id", memberId)
      .single()

    if (!memberProfile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // If user is admin (not superadmin), verify they can only delete members from their own organization
    if (profile.role === "admin" && profile.organization_id !== memberProfile.organization_id) {
      return NextResponse.json(
        { error: "Forbidden: Admins can only delete members from their own organization" },
        { status: 403 },
      )
    }

    // Delete the profile first (this will cascade if configured)
    const { error: profileError } = await serviceRoleClient.from("profiles").delete().eq("id", memberId)

    if (profileError) {
      console.error("Error deleting profile:", profileError)
      return NextResponse.json(
        { error: "Failed to delete profile", message: profileError.message },
        { status: 500 },
      )
    }

    // Delete the auth user
    // Note: If the profile has ON DELETE CASCADE, this might not be necessary
    // but we'll do it explicitly to ensure cleanup
    const { error: authError } = await serviceRoleClient.auth.admin.deleteUser(memberId)

    if (authError) {
      console.error("Error deleting auth user:", authError)
      // Profile is already deleted, so we'll log the error but still return success
      // The auth user might have been deleted by cascade or might not exist
      console.warn("Auth user deletion failed, but profile was deleted successfully")
    }

    console.log(`[delete-member] Successfully deleted member: ${memberProfile.email} (${memberId})`)

    return NextResponse.json({
      success: true,
      message: `Miembro ${memberProfile.name} eliminado exitosamente`,
    })
  } catch (error) {
    console.error("Error deleting member:", error)
    return NextResponse.json(
      {
        error: "Failed to delete member",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

