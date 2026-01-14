import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

/**
 * GET /api/get-member-entities
 * Gets assigned entities for a member using service role to bypass RLS
 */
export async function GET(request: NextRequest) {
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
        { error: "Forbidden: Only superadmins and admins can view entity assignments" },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("memberId")

    if (!memberId) {
      return NextResponse.json(
        { error: "Missing required parameter: memberId" },
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
      .select("id, organization_id")
      .eq("id", memberId)
      .single()

    if (memberError || !memberProfile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // If user is admin (not superadmin), verify they can only view assignments for members in their own organization
    if (profile.role === "admin" && profile.organization_id !== memberProfile.organization_id) {
      return NextResponse.json(
        { error: "Forbidden: Admins can only view assignments for members in their own organization" },
        { status: 403 },
      )
    }

    // Get assigned entities
    const { data: assignments, error: assignmentsError } = await serviceRoleClient
      .from("member_entities")
      .select("entity_id")
      .eq("member_id", memberId)

    if (assignmentsError) {
      console.error("[get-member-entities] Error fetching assignments:", assignmentsError)
      return NextResponse.json(
        { error: "Failed to fetch assignments", message: assignmentsError.message },
        { status: 500 },
      )
    }

    const entityIds = (assignments || []).map((a) => a.entity_id)

    return NextResponse.json({
      success: true,
      entityIds,
    })
  } catch (error) {
    console.error("Error getting member entities:", error)
    return NextResponse.json(
      {
        error: "Failed to get member entities",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

