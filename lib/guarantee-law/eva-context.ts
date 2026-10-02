/**
 * Contexto de periodos de restricción para EVA (CAP-11 / CA-046.2).
 * Sale de guarantee_law_periods + etapas del proceso, no de conocimiento general.
 */

import { createClient } from "@supabase/supabase-js"

const STAGE_LABELS: Record<string, string> = {
  publicacion: "Publicación",
  observaciones: "Observaciones",
  adjudicacion: "Adjudicación",
  firma: "Firma",
  garantias: "Garantías",
  inicio: "Inicio",
}

const PROCESS_CODE_RE = /\b[A-ZÁÉÍÓÚÑ]{2,}(?:-[A-Z0-9]+){1,4}\b/gi

function getService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!key || !url) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

/** Bloque para el system prompt: periodos vigentes o futuros + etapas si el usuario cita un código. */
export async function buildGuaranteeLawEvaContext(userMessage: string): Promise<string> {
  const service = getService()
  if (!service) return ""

  const today = new Date().toISOString().split("T")[0]
  const { data: periods, error } = await service
    .from("guarantee_law_periods")
    .select("name, starts_on, ends_on, scope")
    .gte("ends_on", today)
    .order("starts_on", { ascending: true })
    .limit(20)

  if (error || !periods || periods.length === 0) return ""

  const periodLines = periods
    .map((p) => `- "${p.name}": ${p.starts_on} a ${p.ends_on}${p.scope ? ` (${p.scope})` : ""}`)
    .join("\n")

  let processBlock = ""
  const codes = [...new Set((userMessage.match(PROCESS_CODE_RE) || []).map((c) => c.toUpperCase()))]
  for (const code of codes.slice(0, 3)) {
    const { data: proc } = await service.from("processes").select("id, code").ilike("code", code).maybeSingle()
    if (!proc) {
      processBlock += `\nNo hay un proceso con código ${code} en EVA.`
      continue
    }
    const { data: stages } = await service
      .from("process_stages")
      .select("stage_key, due_date")
      .eq("process_id", proc.id)

    const withDates = (stages || []).filter((s) => s.due_date)
    if (withDates.length === 0) {
      processBlock += `\nProceso ${proc.code}: no tiene fechas de etapa cargadas en el cronograma.`
      continue
    }

    const stageLines = withDates
      .map((s) => `  - ${STAGE_LABELS[s.stage_key] || s.stage_key}: ${s.due_date}`)
      .join("\n")

    const hits: string[] = []
    for (const s of withDates) {
      for (const p of periods) {
        if (s.due_date && dateInRange(s.due_date, p.starts_on, p.ends_on)) {
          hits.push(
            `  - ${STAGE_LABELS[s.stage_key] || s.stage_key} (${s.due_date}) cae en "${p.name}" (${p.starts_on} a ${p.ends_on})`,
          )
        }
      }
    }

    processBlock += `\nProceso ${proc.code} (cronograma en EVA):\n${stageLines}`
    processBlock += hits.length
      ? `\nCruce con periodos de restricción:\n${hits.join("\n")}`
      : `\nNinguna fecha de etapa de ${proc.code} cae en un periodo de restricción cargado en EVA.`
  }

  return `

**Datos de la plataforma (prioridad sobre conocimiento general)**:
Periodos de restricción cargados en EVA (vigentos o por iniciar):
${periodLines}
${processBlock}

Si el usuario pregunta por un proceso o por ley de garantías / periodos de restricción, responde con ESTOS datos. No inventes periodos de elecciones si contradicen esta lista. Indica nombre y fechas del periodo de EVA.`
}
