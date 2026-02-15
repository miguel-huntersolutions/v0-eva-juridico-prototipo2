/**
 * GET /api/entities?organizationId=xxx
 * Returns entities for the given organization using service role.
 * Allowed only for admin/superadmin (e.g. when impersonating) so they see the same data as the member.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 })
    }

    // Only admin or superadmin can request entities for an organization (e.g. when impersonating)
    if (profile.role !== "admin" && profile.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: only admin or superadmin" }, { status: 403 })
    }
    if (profile.role === "admin" && profile.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden: admin can only request own organization" }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Service role not configured" }, { status: 500 })
    }

    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: entities, error: entitiesError } = await service
      .from("entities")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name")

    if (entitiesError) {
      return NextResponse.json({ error: entitiesError.message }, { status: 500 })
    }

    const withCounts = await Promise.all(
      (entities || []).map(async (e) => {
        const { count: processesCount } = await service
          .from("processes")
          .select("*", { count: "exact", head: true })
          .eq("entity_id", e.id)
        const { data: processes } = await service.from("processes").select("id").eq("entity_id", e.id)
        const processIds = processes?.map((p) => p.id) || []
        const { count: documentsCount } =
          processIds.length > 0
            ? await service.from("documents").select("*", { count: "exact", head: true }).in("process_id", processIds)
            : { count: 0 }
        return {
          id: e.id,
          name: e.name,
          nit: e.nit,
          representativeName: e.representative_name,
          organizationId: e.organization_id,
          logoUrl: e.logo_url,
          status: e.status,
          processesCount: processesCount ?? 0,
          documentsCount: documentsCount ?? 0,
        }
      })
    )

    return NextResponse.json(withCounts)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
