/**
 * CAP-11 (CA-044.1/CA-044.2): resumen del cronograma por proceso para el
 * tablero/listado: próxima etapa pendiente (con días que faltan) y cuántas
 * etapas vencidas sin cumplir tiene cada proceso.
 *
 * GET /api/processes/stages-summary → { summary: { [processId]: {...} } }
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

const STAGE_ORDER = ["publicacion", "observaciones", "adjudicacion", "firma", "garantias", "inicio"]

const STAGE_LABELS: Record<string, string> = {
  publicacion: "Publicación",
  observaciones: "Observaciones",
  adjudicacion: "Adjudicación",
  firma: "Firma",
  garantias: "Garantías",
  inicio: "Inicio",
}

export async function GET() {
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

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Etapas pendientes de procesos de la organización del usuario
    const { data: stages, error } = await service
      .from("process_stages")
      .select(
        "process_id, stage_key, due_date, process:processes!inner(entity:entities!inner(organization_id))",
      )
      .is("completed_at", null)
      .eq("process.entity.organization_id", profile.organization_id)
      .limit(3000)

    if (error) {
      // Tabla aún no creada (SQL 040 no ejecutado): devolver vacío
      console.warn("[stages-summary]", error.message)
      return NextResponse.json({ summary: {} })
    }

    const today = new Date().toISOString().split("T")[0]
    const summary: Record<
      string,
      {
        nextStageLabel: string
        nextStageDate: string
        daysUntil: number
        overdueCount: number
      }
    > = {}

    const byProcess: Record<string, Array<{ stage_key: string; due_date: string }>> = {}
    for (const s of stages || []) {
      if (!byProcess[s.process_id]) byProcess[s.process_id] = []
      byProcess[s.process_id].push({ stage_key: s.stage_key, due_date: s.due_date })
    }

    for (const [processId, list] of Object.entries(byProcess)) {
      // Orden SECOP y luego por fecha
      const ordered = [...list].sort((a, b) => {
        const ai = STAGE_ORDER.indexOf(a.stage_key)
        const bi = STAGE_ORDER.indexOf(b.stage_key)
        return ai !== bi ? ai - bi : a.due_date.localeCompare(b.due_date)
      })
      const overdueCount = ordered.filter((s) => s.due_date < today).length
      const next = ordered.find((s) => s.due_date >= today) ?? ordered[0]
      if (!next) continue
      const daysUntil = Math.ceil(
        (new Date(next.due_date).getTime() - new Date(today).getTime()) / 86400000,
      )
      summary[processId] = {
        nextStageLabel: STAGE_LABELS[next.stage_key] ?? next.stage_key,
        nextStageDate: next.due_date,
        daysUntil,
        overdueCount,
      }
    }

    return NextResponse.json({ summary })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
