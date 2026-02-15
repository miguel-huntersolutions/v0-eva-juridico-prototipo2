/**
 * GET /api/documents?organizationId=xxx
 * Returns documents for the given organization using service role.
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

    const { data: processes } = await service
      .from("processes")
      .select("id")
      .in("entity_id", entityIds)
    const processIds = (processes || []).map((p) => p.id)
    if (processIds.length === 0) {
      return NextResponse.json([])
    }

    const { data: documents, error: docsError } = await service
      .from("documents")
      .select(`
        *,
        process:processes(
          id,
          code,
          object,
          drive_folder_url,
          entity:entities(id, name)
        )
      `)
      .in("process_id", processIds)
      .order("updated_at", { ascending: false })

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 })
    }

    const mapped = (documents || []).map((d: any) => ({
      id: d.id,
      processId: d.process_id,
      processCode: d.process?.code || "",
      processObject: d.process?.object || "",
      name: d.name,
      type: d.type,
      version: d.version || 1,
      status: d.status,
      entityId: d.process?.entity?.id || "",
      entityName: d.process?.entity?.name || "",
      fileUrl: d.file_url || "",
      fileSize: d.file_size || 0,
      createdBy: "",
      createdAt: d.created_at?.split("T")[0] || "",
      updatedAt: d.updated_at?.split("T")[0] || "",
      driveFolderUrl: d.process?.drive_folder_url ?? null,
    }))

    return NextResponse.json(mapped)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
