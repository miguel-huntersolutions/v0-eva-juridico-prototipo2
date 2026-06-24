import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/pending-users
 * Returns all profiles with status = 'pending'. Superadmin only.
 * Uses session + RLS (profiles_superadmin_select). No service_role key required.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error: "Server configuration error",
          message: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel",
        },
        { status: 500 },
      )
    }

    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("[pending-users] auth.getUser failed:", authError)
      return NextResponse.json(
        { error: "Unauthorized", message: authError.message },
        { status: 401 },
      )
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("[pending-users] profile lookup failed:", profileError)
      return NextResponse.json(
        {
          error: "Failed to fetch pending users",
          message: profileError.message,
          hint: "Revisa NEXT_PUBLIC_SUPABASE_* en Vercel (Preview) y ejecuta scripts/033-grant-supabase-roles.sql.",
        },
        { status: 500 },
      )
    }

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
      console.error("[pending-users] pending query failed:", profilesError)
      return NextResponse.json(
        {
          error: "Failed to fetch pending users",
          message: profilesError.message,
          hint: "Ejecuta scripts/021-allow-superadmin-view-profiles.sql y scripts/033-grant-supabase-roles.sql en Supabase.",
        },
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

    return NextResponse.json({ users, meta: { count: users.length } })
  } catch (error) {
    console.error("Error in pending-users:", error)
    return NextResponse.json(
      { error: "Failed to fetch pending users", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
