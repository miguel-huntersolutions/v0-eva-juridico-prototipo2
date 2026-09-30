/**
 * RF-012 (CAP-03): reutilizar un proceso.
 * Crea un proceso nuevo en borrador con el mismo tipo, código nuevo y todos los
 * campos del formulario precargados desde el proceso original (sin copiar las
 * ediciones manuales hechas a los documentos en Drive).
 *
 * CA-012.2: si se elige otra entidad/secretaría, los campos que nombran a la
 * entidad quedan marcados para revisión (confirmed=false).
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { logAuditEvent, getRequestIp } from "@/lib/audit/log"

function makeCode(typeName: string): string {
  const abbrev = (typeName || "PR")
    .split(" ")
    .map((w) => w[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 3)
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `${abbrev}-${year}-${rand}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ processId: string }> },
) {
  try {
    const { processId } = await params
    if (!processId) return NextResponse.json({ error: "processId is required" }, { status: 400 })

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

    const body = await request.json().catch(() => ({}))
    const targetEntityId: string | undefined = body.entityId
    const targetSecretaryId: string | undefined = body.secretaryId

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Proceso original + org
    const { data: orig, error: origErr } = await service
      .from("processes")
      .select("*, entity:entities(organization_id), process_type:process_types(name)")
      .eq("id", processId)
      .single()
    if (origErr || !orig) return NextResponse.json({ error: "Process not found" }, { status: 404 })

    const orgId = (orig.entity as any)?.organization_id
    if ((profile.role === "admin" || profile.role === "member") && profile.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Entidad destino (por defecto la misma). Debe pertenecer a la misma org.
    const finalEntityId = targetEntityId || orig.entity_id
    const { data: targetEntity, error: entErr } = await service
      .from("entities")
      .select("id, organization_id")
      .eq("id", finalEntityId)
      .single()
    if (entErr || !targetEntity) return NextResponse.json({ error: "Target entity not found" }, { status: 404 })
    if (targetEntity.organization_id !== orgId) {
      return NextResponse.json({ error: "Target entity is outside your organization" }, { status: 403 })
    }

    const entityChanged = finalEntityId !== orig.entity_id

    // Código único
    let code = ""
    for (let i = 0; i < 20; i++) {
      const candidate = makeCode((orig.process_type as any)?.name || "PR")
      const { data: existing } = await service.from("processes").select("id").eq("code", candidate).maybeSingle()
      if (!existing) {
        code = candidate
        break
      }
    }
    if (!code) return NextResponse.json({ error: "Could not generate unique code" }, { status: 500 })

    // Crear proceso nuevo en borrador
    const { data: newProcess, error: createErr } = await service
      .from("processes")
      .insert({
        code,
        object: orig.object,
        description: orig.description,
        status: "draft",
        entity_id: finalEntityId,
        secretary_id: targetSecretaryId ?? orig.secretary_id,
        process_type_id: orig.process_type_id,
        current_version: 1,
        created_by: user.id,
        reused_from_process_id: processId,
      })
      .select()
      .single()
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

    // Copiar campos del formulario (RF-012). No copia documentos ni ediciones en Drive.
    const { data: fields } = await service
      .from("process_field_values")
      .select("tag, value, table_rows")
      .eq("process_id", processId)

    let copied = 0
    if (fields && fields.length > 0) {
      const rows = fields.map((f: any) => ({
        process_id: newProcess.id,
        tag: f.tag,
        value: f.value,
        table_rows: f.table_rows,
        origin: "reuse",
        // CA-012.2: si cambió la entidad, los campos que la nombran exigen revisión.
        confirmed: entityChanged ? false : false, // RF-013: todo reutilizado exige confirmación
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }))
      const { error: copyErr } = await service.from("process_field_values").insert(rows)
      if (!copyErr) copied = rows.length
    }

    // CAP-09 (RF-031): auditoría de reutilización (en el proceso original y
    // referencia al nuevo proceso creado)
    await logAuditEvent({
      organizationId: orgId,
      processId,
      actorId: user.id,
      action: "process_reused",
      details: {
        newProcessId: newProcess.id,
        newCode: newProcess.code,
        copiedFields: copied,
        entityChanged,
      },
      ip: getRequestIp(request),
    })

    return NextResponse.json({
      success: true,
      process: { id: newProcess.id, code: newProcess.code, status: newProcess.status },
      copiedFields: copied,
      entityChanged,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
