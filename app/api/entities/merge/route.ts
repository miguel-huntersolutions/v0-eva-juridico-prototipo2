/**
 * CAP-10 (RF-043): fusión de dos entidades repetidas (solo admin).
 *
 * POST { sourceId, targetId }
 * Mueve a la entidad destino: procesos (y con ellos documentos, adjuntos,
 * etapas, mensajes y notificaciones, que cuelgan del proceso), asignaciones de
 * miembros (member_entities) y contactos de entidad (profiles.entity_id).
 * La origen queda inactiva con merged_into → destino y no aparece en ningún
 * selector (CA-043.1). Todo queda en auditoría.
 *
 * CA-043.2: los procesos se mueven PRIMERO; si ese paso falla se aborta antes
 * de tocar lo demás (ningún proceso queda sin entidad). La respuesta informa
 * qué se movió y qué no.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { logAuditEvent, getRequestIp } from "@/lib/audit/log"

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Solo el administrador puede fusionar entidades" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const sourceId = typeof body?.sourceId === "string" ? body.sourceId : null
    const targetId = typeof body?.targetId === "string" ? body.targetId : null
    if (!sourceId || !targetId) {
      return NextResponse.json({ error: "sourceId y targetId son obligatorios" }, { status: 400 })
    }
    if (sourceId === targetId) {
      return NextResponse.json({ error: "La entidad origen y destino deben ser distintas" }, { status: 400 })
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Validar ambas entidades de la misma organización
    const { data: entities } = await service
      .from("entities")
      .select("id, name, status, organization_id")
      .in("id", [sourceId, targetId])
    const source = entities?.find((e) => e.id === sourceId)
    const target = entities?.find((e) => e.id === targetId)
    if (!source || !target) return NextResponse.json({ error: "Entidad no encontrada" }, { status: 404 })
    if (source.organization_id !== target.organization_id) {
      return NextResponse.json({ error: "Las entidades deben ser de la misma organización" }, { status: 400 })
    }
    if (profile.role === "admin" && profile.organization_id !== source.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (target.status !== "active") {
      return NextResponse.json({ error: "La entidad destino debe estar activa" }, { status: 400 })
    }

    const report: Record<string, number | string> = {}

    // 1. PROCESOS primero (lo crítico: CA-043.2 — si falla, se aborta)
    const { data: movedProcesses, error: procErr } = await service
      .from("processes")
      .update({ entity_id: targetId, updated_at: new Date().toISOString() })
      .eq("entity_id", sourceId)
      .select("id")
    if (procErr) {
      return NextResponse.json(
        { error: `Fallo moviendo procesos (no se movió nada más): ${procErr.message}` },
        { status: 500 },
      )
    }
    report.processesMoved = movedProcesses?.length ?? 0

    // 2. Asignaciones de miembros (member_entities): mover sin duplicar
    const { data: sourceAccess } = await service
      .from("member_entities")
      .select("id, member_id")
      .eq("entity_id", sourceId)
    let accessMoved = 0
    for (const acc of sourceAccess || []) {
      const { data: existing } = await service
        .from("member_entities")
        .select("id")
        .eq("member_id", acc.member_id)
        .eq("entity_id", targetId)
        .maybeSingle()
      if (existing) {
        await service.from("member_entities").delete().eq("id", acc.id)
      } else {
        await service.from("member_entities").update({ entity_id: targetId }).eq("id", acc.id)
      }
      accessMoved++
    }
    report.memberAccessMoved = accessMoved

    // 3. Contactos de entidad (profiles.entity_id)
    const { data: movedContacts } = await service
      .from("profiles")
      .update({ entity_id: targetId })
      .eq("entity_id", sourceId)
      .select("id")
    report.entityContactsMoved = movedContacts?.length ?? 0

    // 4. Secretarías de la entidad origen → destino
    const { data: movedSecretaries, error: secErr } = await service
      .from("secretaries")
      .update({ entity_id: targetId, updated_at: new Date().toISOString() })
      .eq("entity_id", sourceId)
      .select("id")
    if (secErr) {
      report.secretariesError = secErr.message
    } else {
      report.secretariesMoved = movedSecretaries?.length ?? 0
    }

    // 5. Desactivar la origen y marcar la fusión
    const { error: deactivateErr } = await service
      .from("entities")
      .update({
        status: "inactive",
        merged_into: targetId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId)
    if (deactivateErr) {
      return NextResponse.json(
        {
          error: `Los datos se movieron pero no se pudo desactivar la origen: ${deactivateErr.message}`,
          report,
        },
        { status: 500 },
      )
    }

    // 6. Auditoría (RF-031 + RF-043: "dejar el evento en auditoría")
    await logAuditEvent({
      action: "process_updated",
      actorId: user.id,
      organizationId: source.organization_id,
      details: {
        entitiesMerged: { source: source.name, target: target.name },
        report,
      },
      ip: getRequestIp(request),
    })

    return NextResponse.json({ success: true, report })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
