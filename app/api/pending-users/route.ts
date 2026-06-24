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

    const { data: pendingProfiles, error: profilesError } = await supabase.rpc("list_pending_profiles")

    if (profilesError) {
      const rpcMissing =
        profilesError.code === "PGRST202" ||
        profilesError.message?.includes("list_pending_profiles") ||
        profilesError.message?.includes("Could not find the function")

      if (rpcMissing) {
        const fallback = await supabase
          .from("profiles")
          .select("id, name, email, role, status, organization_id, created_at, updated_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })

        if (fallback.error) {
          console.error("[pending-users] Fallback query failed:", fallback.error)
          return NextResponse.json(
            {
              error: "Failed to fetch pending users",
              message: fallback.error.message,
              hint: "Ejecuta scripts/021-allow-superadmin-view-profiles.sql y scripts/033-grant-supabase-roles.sql en Supabase.",
            },
            { status: 500 },
          )
        }

        return buildPendingUsersResponse(supabase, fallback.data || [], "fallback")
      }

      if (profilesError.message?.includes("Forbidden: superadmin only")) {
        return NextResponse.json(
          { error: "Forbidden: Only superadmins can view pending users" },
          { status: 403 },
        )
      }

      console.error("[pending-users] RPC list_pending_profiles failed:", profilesError)
      return NextResponse.json(
        {
          error: "Failed to fetch pending users",
          message: profilesError.message,
          hint: "Ejecuta scripts/034-list-pending-profiles-rpc.sql en el SQL Editor de Supabase.",
        },
        { status: 500 },
      )
    }

    return buildPendingUsersResponse(supabase, pendingProfiles || [], "rpc")
  } catch (error) {
    console.error("Error in pending-users:", error)
    return NextResponse.json(
      { error: "Failed to fetch pending users", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

async function buildPendingUsersResponse(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  pendingProfiles: Array<{
    id: string
    name: string | null
    email: string
    role: string
    status: string
    organization_id: string | null
    created_at: string
    updated_at: string
  }>,
  source: "rpc" | "fallback",
) {
  const orgIds = [...new Set(pendingProfiles.map((p) => p.organization_id).filter(Boolean))] as string[]
  let orgMap: Record<string, { name: string }> = {}
  if (orgIds.length > 0) {
    const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds)
    orgMap = (orgs || []).reduce((acc, o) => ({ ...acc, [o.id]: { name: o.name } }), {})
  }

  const users = pendingProfiles.map((p) => ({
    ...p,
    organizationName: p.organization_id ? orgMap[p.organization_id]?.name ?? null : null,
  }))

  return NextResponse.json({ users, meta: { source, count: users.length } })
}
