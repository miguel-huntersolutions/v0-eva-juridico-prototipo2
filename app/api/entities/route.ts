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
    if (!entities?.length) {
      return NextResponse.json([])
    }

    const entityIds = entities.map((e) => e.id)
    const { data: processes, error: procErr } = await service
      .from("processes")
      .select("id, entity_id")
      .in("entity_id", entityIds)
    if (procErr) {
      return NextResponse.json({ error: procErr.message }, { status: 500 })
    }

    const processIds = (processes || []).map((p) => p.id)
    const processIdsByEntityId: Record<string, string[]> = {}
    for (const e of entities) {
      processIdsByEntityId[e.id] = []
    }
    for (const p of processes || []) {
      const eid = p.entity_id
      if (!processIdsByEntityId[eid]) processIdsByEntityId[eid] = []
      processIdsByEntityId[eid].push(p.id)
    }

    let documentCountByProcessId: Record<string, number> = {}
    if (processIds.length > 0) {
      const { data: docs } = await service.from("documents").select("process_id").in("process_id", processIds)
      for (const d of docs || []) {
        documentCountByProcessId[d.process_id] = (documentCountByProcessId[d.process_id] || 0) + 1
      }
    }

    const withCounts = entities.map((e) => {
      const pIds = processIdsByEntityId[e.id] || []
      const documentsCount = pIds.reduce((sum, pid) => sum + (documentCountByProcessId[pid] || 0), 0)
      return {
        id: e.id,
        name: e.name,
        nit: e.nit,
        representativeName: e.representative_name,
        organizationId: e.organization_id,
        logoUrl: e.logo_url,
        status: e.status,
        processesCount: pIds.length,
        documentsCount,
      }
    })

    return NextResponse.json(withCounts)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
