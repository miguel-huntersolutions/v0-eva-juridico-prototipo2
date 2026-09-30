/**
 * CAP-11 (RF-045): alertas de vencimiento de etapas del cronograma.
 *
 * Corre a diario (Vercel Cron, 12:00 UTC = 7:00 Colombia, antes de las 8:00 —
 * CA-045.1). Por cada etapa NO cumplida cuya fecha sea en exactamente 3 días
 * o en 1 día, notifica en la app al responsable del proceso y a los admins de
 * la organización (CA-045.3: sin responsable, solo admins y la alerta lo dice).
 *
 * Idempotente: `stage_alerts_sent` registra cada alerta (3d/1d) por etapa.
 * El correo queda pendiente de infra transaccional; su fallo nunca impide la
 * notificación en la app (mismo criterio que CA-026.3).
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export const maxDuration = 120

const STAGE_LABELS: Record<string, string> = {
  publicacion: "Publicación",
  observaciones: "Observaciones",
  adjudicacion: "Adjudicación",
  firma: "Firma",
  garantias: "Garantías",
  inicio: "Inicio",
}

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true

  // Manual: superadmin autenticado
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  return profile?.role === "superadmin"
}

function datePlusDays(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split("T")[0]
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const service = getServiceClient()
    const in3Days = datePlusDays(3)
    const in1Day = datePlusDays(1)

    // Etapas pendientes que vencen en 3 o 1 días
    const { data: stages, error } = await service
      .from("process_stages")
      .select(
        "id, stage_key, due_date, process:processes(id, code, assigned_to, entity:entities(name, organization_id))",
      )
      .is("completed_at", null)
      .in("due_date", [in3Days, in1Day])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Alertas ya enviadas para estas etapas (idempotencia)
    const stageIds = (stages || []).map((s) => s.id)
    const { data: alreadySent } = stageIds.length
      ? await service.from("stage_alerts_sent").select("process_stage_id, alert_kind").in("process_stage_id", stageIds)
      : { data: [] }
    const sentSet = new Set((alreadySent || []).map((a) => `${a.process_stage_id}:${a.alert_kind}`))

    let sent = 0
    const notifications: Array<Record<string, unknown>> = []
    const sentRows: Array<Record<string, unknown>> = []

    for (const stage of stages || []) {
      const kind = stage.due_date === in3Days ? "3d" : "1d"
      if (sentSet.has(`${stage.id}:${kind}`)) continue

      const proc = stage.process as any
      const orgId = proc?.entity?.organization_id
      if (!orgId) continue

      const daysLabel = kind === "3d" ? "3 días" : "1 día"
      const stageLabel = STAGE_LABELS[stage.stage_key] ?? stage.stage_key
      const title = `Vence en ${daysLabel}: ${stageLabel} — ${proc.code}`
      const noAssignee = !proc.assigned_to
      const bodyText = `La etapa ${stageLabel} del proceso ${proc.code} (${proc.entity?.name ?? "entidad"}) vence el ${stage.due_date}.${noAssignee ? " El proceso no tiene responsable asignado." : ""}`

      // Destinatarios: responsable + admins de la org (CA-045.3)
      const recipients = new Set<string>()
      if (proc.assigned_to) recipients.add(proc.assigned_to as string)
      const { data: admins } = await service
        .from("profiles")
        .select("id")
        .eq("organization_id", orgId)
        .in("role", ["admin"])
        .eq("status", "approved")
      for (const a of admins || []) recipients.add(a.id)

      for (const userId of recipients) {
        notifications.push({
          user_id: userId,
          organization_id: orgId,
          process_id: proc.id,
          type: "stage_due_alert",
          title,
          body: bodyText,
        })
      }
      sentRows.push({ process_stage_id: stage.id, alert_kind: kind })
      sent++
    }

    if (notifications.length > 0) {
      const { error: notifErr } = await service.from("notifications").insert(notifications)
      if (notifErr) console.error("[stage-alerts] Error insertando notificaciones:", notifErr.message)
    }
    if (sentRows.length > 0) {
      const { error: sentErr } = await service.from("stage_alerts_sent").insert(sentRows)
      if (sentErr) console.error("[stage-alerts] Error registrando envíos:", sentErr.message)
    }

    console.log(`[stage-alerts] Alertas generadas: ${sent} (etapas candidatas: ${(stages || []).length})`)
    return NextResponse.json({ success: true, alertsSent: sent, candidates: (stages || []).length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
