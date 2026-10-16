/**
 * Contexto de periodos de restricción para EVA (CAP-11 / CA-046.2).
 * Sale de guarantee_law_periods (por organización) + etapas del proceso.
 */

import { createClient } from "@supabase/supabase-js"
import { APP_NAME } from "@/lib/brand"

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

/** Bloque para el system prompt: periodos vigentes o futuros de la org + etapas si el usuario cita un código. */
export async function buildGuaranteeLawEvaContext(
  userMessage: string,
  organizationId?: string | null,
): Promise<string> {
  const service = getService()
  if (!service) return ""

  const today = new Date().toISOString().split("T")[0]

  // Resolver org desde el proceso citado si no viene en el perfil
  let orgId = organizationId || null
  const codes = [...new Set((userMessage.match(PROCESS_CODE_RE) || []).map((c) => c.toUpperCase()))]

  type PeriodRow = { name: string; starts_on: string; ends_on: string; scope: string | null }
  let periods: PeriodRow[] = []

  if (orgId) {
    const { data, error } = await service
      .from("guarantee_law_periods")
      .select("name, starts_on, ends_on, scope")
      .eq("organization_id", orgId)
      .gte("ends_on", today)
      .order("starts_on", { ascending: true })
      .limit(20)
    if (!error && data) periods = data
  }

  let processBlock = ""
  for (const code of codes.slice(0, 3)) {
    const { data: proc } = await service
      .from("processes")
      .select("id, code, entity:entities(organization_id)")
      .ilike("code", code)
      .maybeSingle()
    if (!proc) {
      processBlock += `\nNo hay un proceso con código ${code} en ${APP_NAME}.`
      continue
    }

    const procOrgId = (proc.entity as { organization_id?: string } | null)?.organization_id ?? null
    if (procOrgId && !orgId) {
      orgId = procOrgId
      const { data, error } = await service
        .from("guarantee_law_periods")
        .select("name, starts_on, ends_on, scope")
        .eq("organization_id", orgId)
        .gte("ends_on", today)
        .order("starts_on", { ascending: true })
        .limit(20)
      if (!error && data) periods = data
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

    processBlock += `\nProceso ${proc.code} (cronograma en ${APP_NAME}):\n${stageLines}`
    processBlock += hits.length
      ? `\nCruce con periodos de restricción:\n${hits.join("\n")}`
      : `\nNinguna fecha de etapa de ${proc.code} cae en un periodo de restricción cargado en ${APP_NAME}.`
  }

  if (periods.length === 0 && !processBlock) return ""

  const periodLines =
    periods.length > 0
      ? periods
          .map((p) => `- "${p.name}": ${p.starts_on} a ${p.ends_on}${p.scope ? ` (${p.scope})` : ""}`)
          .join("\n")
      : "(ninguno cargado para esta organización)"

  return `

**Datos de la plataforma (prioridad sobre conocimiento general)**:
Periodos de restricción cargados en ${APP_NAME} (vigentes o por iniciar):
${periodLines}
${processBlock}

Si el usuario pregunta por un proceso o por ley de garantías / periodos de restricción, responde con ESTOS datos. No inventes periodos de elecciones si contradicen esta lista. Indica nombre y fechas del periodo de EVA.`
}
