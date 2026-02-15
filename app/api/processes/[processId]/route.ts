/**
 * GET /api/processes/[processId]
 * Returns a single process by id using service role when impersonating.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ processId: string }> }
) {
  try {
    const { processId } = await params
    if (!processId) {
      return NextResponse.json({ error: "processId is required" }, { status: 400 })
    }

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

    if (profile.role !== "admin" && profile.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: only admin or superadmin" }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Service role not configured" }, { status: 500 })
    }

    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: p, error } = await service
      .from("processes")
      .select(`
        *,
        entity:entities(id, name),
        secretary:secretaries(id, name),
        process_type:process_types(id, name)
      `)
      .eq("id", processId)
      .single()

    if (error || !p) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    const { count } = await service.from("documents").select("*", { count: "exact", head: true }).eq("process_id", processId)

    const mapped = {
      id: p.id,
      code: p.code || "",
      object: p.object || "",
      description: p.description || "",
      status: p.status,
      entityId: p.entity_id,
      entityName: (p as any).entity?.name || "",
      secretaryId: p.secretary_id,
      secretaryName: (p as any).secretary?.name || "",
      processTypeId: p.process_type_id,
      processTypeName: (p as any).process_type?.name || "",
      createdAt: p.created_at?.split("T")[0] || "",
      updatedAt: p.updated_at?.split("T")[0] || "",
      documentsCount: count ?? 0,
      currentVersion: p.current_version || 1,
      spreadsheetId: (p as any).spreadsheet_id ?? null,
      spreadsheetUrl: (p as any).spreadsheet_url ?? null,
      driveFolderId: (p as any).drive_folder_id ?? null,
      driveFolderUrl: (p as any).drive_folder_url ?? null,
    }

    return NextResponse.json(mapped)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
