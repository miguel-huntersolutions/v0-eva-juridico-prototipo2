/**
 * CAP-09 (RF-041): vista por entidad de todos los contratos y documentos
 * generados en EVA, con tipo de documento, proceso, estado, fecha de la
 * versión vigente y responsable. Solo admin/superadmin.
 * (Los contratos anteriores a EVA no se incluyen: solo registros de `documents`.)
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> },
) {
  try {
    const { entityId } = await params
    if (!entityId) return NextResponse.json({ error: "entityId is required" }, { status: 400 })

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 })
    if (profile.role !== "admin" && profile.role !== "superadmin") {
      return NextResponse.json({ error: "Solo el administrador puede ver esta vista" }, { status: 403 })
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: entity, error: entErr } = await service
      .from("entities")
      .select("id, name, organization_id")
      .eq("id", entityId)
      .single()
    if (entErr || !entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 })
    if (profile.role === "admin" && profile.organization_id !== entity.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Procesos de la entidad con su responsable
    const { data: processes, error: procErr } = await service
      .from("processes")
      .select("id, code, status, assigned:profiles!processes_assigned_to_fkey(name, email)")
      .eq("entity_id", entityId)
    if (procErr) return NextResponse.json({ error: procErr.message }, { status: 500 })

    const processById: Record<string, any> = {}
    for (const p of processes || []) processById[p.id] = p
    const processIds = Object.keys(processById)
    if (processIds.length === 0) {
      return NextResponse.json({ entityName: entity.name, documents: [], total: 0 })
    }

    // Documentos generados de esos procesos (solo los registrados por EVA)
    const { data: docs, error: docsErr } = await service
      .from("documents")
      .select("id, name, type, status, version, created_at, process_id, template:templates(name)")
      .in("process_id", processIds)
      .order("created_at", { ascending: false })
      .limit(1000)
    if (docsErr) return NextResponse.json({ error: docsErr.message }, { status: 500 })

    // Versión vigente = la mayor versión por (proceso, nombre)
    const latestVersion: Record<string, number> = {}
    for (const d of docs || []) {
      const key = `${d.process_id}::${d.name}`
      if (!latestVersion[key] || (d.version || 1) > latestVersion[key]) {
        latestVersion[key] = d.version || 1
      }
    }

    const mapped = (docs || []).map((d: any) => {
      const proc = processById[d.process_id]
      const isCurrent = (d.version || 1) === latestVersion[`${d.process_id}::${d.name}`]
      return {
        id: d.id,
        documentName: d.name,
        documentType: (d.template as any)?.name ?? d.type ?? "Documento",
        processId: d.process_id,
        processCode: proc?.code ?? "",
        processStatus: proc?.status ?? "",
        status: d.status,
        version: d.version || 1,
        isCurrentVersion: isCurrent,
        currentVersionDate: d.created_at,
        responsibleName: proc?.assigned?.name || proc?.assigned?.email || null,
      }
    })

    return NextResponse.json({ entityName: entity.name, documents: mapped, total: mapped.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
