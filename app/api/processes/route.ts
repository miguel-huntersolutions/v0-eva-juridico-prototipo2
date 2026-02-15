/**
 * GET /api/processes?organizationId=xxx
 * Returns processes for the given organization using service role.
 * For use when impersonating so admin/superadmin sees the same data as the member.
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

    const { data: entities } = await service
      .from("entities")
      .select("id")
      .eq("organization_id", organizationId)
    const entityIds = (entities || []).map((e) => e.id)
    if (entityIds.length === 0) {
      return NextResponse.json([])
    }

    const { data: processes, error: processesError } = await service
      .from("processes")
      .select(`
        *,
        entity:entities(id, name),
        secretary:secretaries(id, name),
        process_type:process_types(id, name)
      `)
      .in("entity_id", entityIds)
      .order("updated_at", { ascending: false })

    if (processesError) {
      return NextResponse.json({ error: processesError.message }, { status: 500 })
    }

    const processIds = (processes || []).map((p) => p.id)
    let documentCounts: Record<string, number> = {}
    if (processIds.length > 0) {
      const { data: docs } = await service.from("documents").select("process_id").in("process_id", processIds)
      documentCounts = (docs || []).reduce(
        (acc, d) => {
          acc[d.process_id] = (acc[d.process_id] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )
    }

    const mapped = (processes || []).map((p: any) => ({
      id: p.id,
      code: p.code || "",
      object: p.object || "",
      description: p.description || "",
      status: p.status,
      entityId: p.entity_id,
      entityName: p.entity?.name || "",
      secretaryId: p.secretary_id,
      secretaryName: p.secretary?.name || "",
      processTypeId: p.process_type_id,
      processTypeName: p.process_type?.name || "",
      createdAt: p.created_at?.split("T")[0] || "",
      updatedAt: p.updated_at?.split("T")[0] || "",
      documentsCount: documentCounts[p.id] || 0,
      currentVersion: p.current_version || 1,
      spreadsheetId: p.spreadsheet_id ?? null,
      spreadsheetUrl: p.spreadsheet_url ?? null,
      driveFolderId: p.drive_folder_id ?? null,
      driveFolderUrl: p.drive_folder_url ?? null,
    }))

    return NextResponse.json(mapped)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
