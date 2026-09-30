/**
 * CAP-10 (RF-035): el administrador aprueba o rechaza una entidad propuesta.
 *
 * POST { decision: "approve" | "reject", reason?: string }
 * - approve → status "active": aparece en el selector de procesos (CA-035.3).
 * - reject  → status "rejected" con motivo; el asesor que la propuso recibe la
 *   notificación con el motivo (CA-035.4) y la entidad no se puede usar.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { logAuditEvent, getRequestIp } from "@/lib/audit/log"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> },
) {
  try {
    const { entityId } = await params
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
      return NextResponse.json({ error: "Solo el administrador aprueba entidades" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const decision = body?.decision
    const reason = typeof body?.reason === "string" ? body.reason.trim() : null
    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json({ error: "decision debe ser approve o reject" }, { status: 400 })
    }
    if (decision === "reject" && !reason) {
      return NextResponse.json({ error: "El motivo del rechazo es obligatorio" }, { status: 400 })
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: entity } = await service
      .from("entities")
      .select("id, name, status, organization_id, proposed_by")
      .eq("id", entityId)
      .single()
    if (!entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 })
    if (profile.role === "admin" && profile.organization_id !== entity.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (entity.status !== "pending") {
      return NextResponse.json({ error: "La entidad no está pendiente de aprobación" }, { status: 409 })
    }

    const now = new Date().toISOString()
    const { error: updErr } = await service
      .from("entities")
      .update(
        decision === "approve"
          ? { status: "active", approved_by: user.id, approved_at: now, updated_at: now }
          : { status: "rejected", rejection_reason: reason, updated_at: now },
      )
      .eq("id", entityId)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Notificar al asesor que la propuso (CA-035.4: con el motivo si rechaza)
    if (entity.proposed_by) {
      try {
        await service.from("notifications").insert({
          user_id: entity.proposed_by,
          organization_id: entity.organization_id,
          type: decision === "approve" ? "entity_approved" : "entity_rejected",
          title:
            decision === "approve"
              ? `Entidad aprobada: ${entity.name}`
              : `Entidad rechazada: ${entity.name}`,
          body:
            decision === "approve"
              ? `La entidad "${entity.name}" ya está disponible para crear procesos.`
              : `La entidad "${entity.name}" fue rechazada. Motivo: ${reason}`,
        })
      } catch (notifErr) {
        console.warn("[review-entity] No se pudo notificar:", notifErr)
      }
    }

    await logAuditEvent({
      action: "process_updated",
      actorId: user.id,
      organizationId: entity.organization_id,
      details: {
        entityReviewed: entity.name,
        decision,
        ...(reason ? { reason } : {}),
      },
      ip: getRequestIp(request),
    })

    return NextResponse.json({ success: true, status: decision === "approve" ? "active" : "rejected" })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
