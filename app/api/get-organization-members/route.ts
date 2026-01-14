import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

/**
 * GET /api/get-organization-members
 * Gets all members of an organization using service role to bypass RLS
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
        { error: "Forbidden: Only superadmins and admins can view members" },
        { status: 403 },
      )
    }

    // Get organizationId from query params
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")

    if (!organizationId) {
      return NextResponse.json(
        { error: "Missing required parameter: organizationId" },
        { status: 400 },
      )
    }

    // If user is admin (not superadmin), verify they can only view members in their own organization
    if (profile.role === "admin" && profile.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Forbidden: Admins can only view members in their own organization" },
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

    // Get all members of the organization
    const { data: members, error: membersError } = await serviceRoleClient
      .from("profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name")

    if (membersError) {
      console.error("[get-organization-members] Error fetching members:", membersError)
      return NextResponse.json(
        { error: "Failed to fetch members", message: membersError.message },
        { status: 500 },
      )
    }

    console.log(`[get-organization-members] Found ${members?.length || 0} members for organization ${organizationId}`)

    return NextResponse.json({
      success: true,
      members: members || [],
    })
  } catch (error) {
    console.error("Error getting organization members:", error)
    return NextResponse.json(
      {
        error: "Failed to get organization members",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

