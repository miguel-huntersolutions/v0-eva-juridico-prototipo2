import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * GET /api/pending-users
 * Returns all profiles with status = 'pending'. Superadmin only.
 * Uses the authenticated session + RLS (profiles_superadmin_select, organizations_select).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Only superadmins can view pending users" },
        { status: 403 },
      )
    }

    const { data: pendingProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email, role, status, organization_id, created_at, updated_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("[pending-users] Error fetching pending profiles:", profilesError)
      return NextResponse.json(
        { error: "Failed to fetch pending users", message: profilesError.message },
        { status: 500 },
      )
    }

    const orgIds = [...new Set((pendingProfiles || []).map((p) => p.organization_id).filter(Boolean))] as string[]
    let orgMap: Record<string, { name: string }> = {}
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds)
      orgMap = (orgs || []).reduce((acc, o) => ({ ...acc, [o.id]: { name: o.name } }), {})
    }

    const users = (pendingProfiles || []).map((p) => ({
      ...p,
      organizationName: p.organization_id ? orgMap[p.organization_id]?.name ?? null : null,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error in pending-users:", error)
    return NextResponse.json(
      { error: "Failed to fetch pending users", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
