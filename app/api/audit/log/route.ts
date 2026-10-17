/**
 * CAP-09 (RF-031): endpoint para registrar eventos de auditoría originados en
 * el cliente (crear proceso, cambiar estado, abrir documento, login...).
 *
 * Los eventos que ya pasan por APIs de servidor (generar, eliminar, asignar,
 * reutilizar, guardar borrador) se registran en el servidor directamente con
 * lib/audit/log.ts — este endpoint es solo para acciones que aún se hacen con
 * el cliente de browser.
 *
 * Seguridad: el actor SIEMPRE es el usuario autenticado (no se acepta actorId
 * del body) y se valida que el proceso referenciado sea de su organización.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { logAuditEvent, getRequestIp, type AuditAction } from "@/lib/audit/log"

const ALLOWED_ACTIONS: AuditAction[] = [
  "process_created",
  "process_updated",
  "status_changed",
  "document_opened",
  "document_downloaded",
  "document_sent_to_review",
  "document_approved",
  "document_rejected",
  "attachment_uploaded",
  "login",
  "eva_query",
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const action = body?.action as AuditAction
    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const processId = typeof body?.processId === "string" ? body.processId : null
    const documentId = typeof body?.documentId === "string" ? body.documentId : null
    const details = body?.details && typeof body.details === "object" ? body.details : null

    // Validar que el proceso (si se referencia) pertenece a la org del usuario
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    if (processId && profile.role !== "superadmin") {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
      const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: proc } = await service
        .from("processes")
        .select("entity:entities(organization_id)")
        .eq("id", processId)
        .single()
      const orgId = (proc?.entity as any)?.organization_id
      if (!proc || orgId !== profile.organization_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await logAuditEvent({
      processId,
      documentId,
      actorId: user.id,
      action,
      details: details ?? undefined,
      ip: getRequestIp(request),
      organizationId: profile.role === "superadmin" ? null : profile.organization_id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
