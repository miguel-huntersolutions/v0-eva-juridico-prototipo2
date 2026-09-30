/**
 * CAP-02: progreso de generación de documentos por proceso.
 * Para cada proceso: cuántas plantillas de su tipo ya tienen documento generado
 * (documents.template_id) vs. cuántas plantillas tiene el tipo en total.
 * Usado por la lista de procesos para mostrar "Continuar" solo cuando falta
 * algo por generar (y el progreso "3/9").
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const processIds: string[] = Array.isArray(body?.processIds) ? body.processIds.filter(Boolean) : []
    if (processIds.length === 0) return NextResponse.json({ progress: {} })

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

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Procesos solicitados + su org (para validar acceso)
    const { data: processes, error: procErr } = await service
      .from("processes")
      .select("id, process_type_id, entity:entities(organization_id)")
      .in("id", processIds)
    if (procErr) return NextResponse.json({ error: procErr.message }, { status: 500 })

    const allowed: Array<{ id: string; process_type_id: string | null }> = []
    for (const p of processes || []) {
      const orgId = (p.entity as any)?.organization_id
      const isSuperadmin = profile.role === "superadmin"
      if (isSuperadmin || profile.organization_id === orgId) {
        allowed.push({ id: p.id, process_type_id: p.process_type_id })
      }
    }
    if (allowed.length === 0) return NextResponse.json({ progress: {} })

    // Documentos generados por proceso (distinct template_id)
    const allowedIds = allowed.map((p) => p.id)
    const { data: docs } = await service
      .from("documents")
      .select("process_id, template_id")
      .in("process_id", allowedIds)
      .not("template_id", "is", null)

    const generatedSets: Record<string, Set<string>> = {}
    for (const d of docs || []) {
      if (!d.template_id) continue
      if (!generatedSets[d.process_id]) generatedSets[d.process_id] = new Set()
      generatedSets[d.process_id].add(d.template_id)
    }

    // Total de plantillas por tipo de proceso (relación template_process_types;
    // fallback a templates.process_type_id para tipos sin relaciones, igual que getTemplates)
    const typeIds = [...new Set(allowed.map((p) => p.process_type_id).filter(Boolean))] as string[]
    const totalByType: Record<string, Set<string>> = {}

    if (typeIds.length > 0) {
      const { data: rels } = await service
        .from("template_process_types")
        .select("process_type_id, template_id")
        .in("process_type_id", typeIds)
      for (const r of rels || []) {
        if (!r.template_id) continue
        if (!totalByType[r.process_type_id]) totalByType[r.process_type_id] = new Set()
        totalByType[r.process_type_id].add(r.template_id)
      }

      const typesWithoutRelations = typeIds.filter((t) => !totalByType[t] || totalByType[t].size === 0)
      if (typesWithoutRelations.length > 0) {
        const { data: directTemplates } = await service
          .from("templates")
          .select("id, process_type_id")
          .in("process_type_id", typesWithoutRelations)
        for (const t of directTemplates || []) {
          if (!t.process_type_id) continue
          if (!totalByType[t.process_type_id]) totalByType[t.process_type_id] = new Set()
          totalByType[t.process_type_id].add(t.id)
        }
      }
    }

    const progress: Record<string, { generated: number; total: number }> = {}
    for (const p of allowed) {
      const total = p.process_type_id ? (totalByType[p.process_type_id]?.size ?? 0) : 0
      progress[p.id] = {
        generated: generatedSets[p.id]?.size ?? 0,
        total,
      }
    }

    return NextResponse.json({ progress })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
