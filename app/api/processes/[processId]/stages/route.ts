/**
 * CAP-11 (RF-044/RF-046): cronograma de etapas SECOP de un proceso.
 *
 * GET  → etapas del proceso + próxima etapa + advertencia de ley de garantías.
 * PUT  → guarda las fechas (hasta 6 etapas estándar). Valida:
 *        - CA-044.3: si una fecha es anterior a la de la etapa previa, se
 *          devuelve `orderWarning` y se exige `confirmOrder: true`.
 *        - CA-046.1: si alguna fecha cae en un periodo de ley de garantías,
 *          se devuelve `guaranteeWarning` y se exige `confirmGuarantee: true`
 *          (queda constancia en auditoría).
 *
 * Body PUT: { stages: [{ stageKey, dueDate, completed? }...],
 *             confirmOrder?, confirmGuarantee? }
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { logAuditEvent, getRequestIp } from "@/lib/audit/log"

const STAGE_ORDER = ["publicacion", "observaciones", "adjudicacion", "firma", "garantias", "inicio"] as const
type StageKey = (typeof STAGE_ORDER)[number]

export const STAGE_LABELS: Record<StageKey, string> = {
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

async function getProcessWithOrg(service: ReturnType<typeof getServiceClient>, processId: string) {
  const { data } = await service
    .from("processes")
    .select("id, code, entity_id, entity:entities(organization_id)")
    .eq("id", processId)
    .single()
  return data
}

/** Periodos de ley de garantías que cubren alguna de las fechas dadas. */
async function findGuaranteePeriods(
  service: ReturnType<typeof getServiceClient>,
  dates: string[],
) {
  if (dates.length === 0) return []
  const { data: periods } = await service.from("guarantee_law_periods").select("*")
  return (periods || []).filter((p) =>
    dates.some((d) => d >= p.starts_on && d <= p.ends_on),
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ processId: string }> },
) {
  try {
    const { processId } = await params
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

    const service = getServiceClient()
    const proc = await getProcessWithOrg(service, processId)
    if (!proc) return NextResponse.json({ error: "Process not found" }, { status: 404 })
    const orgId = (proc.entity as any)?.organization_id
    if (profile.role !== "superadmin" && profile.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: stages, error } = await service
      .from("process_stages")
      .select("id, stage_key, due_date, completed_at")
      .eq("process_id", processId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const today = new Date().toISOString().split("T")[0]
    const mapped = STAGE_ORDER.map((key) => {
      const row = (stages || []).find((s) => s.stage_key === key)
      return {
        stageKey: key,
        label: STAGE_LABELS[key],
        dueDate: row?.due_date ?? null,
        completed: !!row?.completed_at,
        overdue: !!row && !row.completed_at && row.due_date < today,
      }
    })

    // Próxima etapa: la primera pendiente con fecha futura o de hoy (CA-044.1)
    const nextStage = mapped.find((s) => !s.completed && s.dueDate && s.dueDate >= today) ?? null
    const daysUntilNext = nextStage?.dueDate
      ? Math.ceil((new Date(nextStage.dueDate).getTime() - new Date(today).getTime()) / 86400000)
      : null

    // Advertencia de ley de garantías vigente sobre las fechas cargadas
    const dates = mapped.filter((s) => s.dueDate).map((s) => s.dueDate as string)
    const periods = await findGuaranteePeriods(service, dates)

    return NextResponse.json({
      stages: mapped,
      nextStage: nextStage ? { ...nextStage, daysUntil: daysUntilNext } : null,
      guaranteePeriods: periods.map((p) => ({
        name: p.name,
        startsOn: p.starts_on,
        endsOn: p.ends_on,
        scope: p.scope,
      })),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ processId: string }> },
) {
  try {
    const { processId } = await params
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
    const stages: Array<{ stageKey: StageKey; dueDate: string | null; completed?: boolean }> =
      Array.isArray(body?.stages) ? body.stages : []
    const confirmOrder = body?.confirmOrder === true
    const confirmGuarantee = body?.confirmGuarantee === true

    // Validar stageKeys
    for (const s of stages) {
      if (!STAGE_ORDER.includes(s.stageKey)) {
        return NextResponse.json({ error: `Etapa desconocida: ${s.stageKey}` }, { status: 400 })
      }
    }

    const service = getServiceClient()
    const proc = await getProcessWithOrg(service, processId)
    if (!proc) return NextResponse.json({ error: "Process not found" }, { status: 404 })
    const orgId = (proc.entity as any)?.organization_id
    if (profile.role !== "superadmin" && profile.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // CA-044.3: avisar si una fecha es anterior a la de la etapa previa
    const withDates = STAGE_ORDER.map((key) => stages.find((s) => s.stageKey === key)).filter(
      (s): s is { stageKey: StageKey; dueDate: string | null; completed?: boolean } => !!s && !!s.dueDate,
    )
    let orderWarning: string | null = null
    for (let i = 1; i < withDates.length; i++) {
      const prev = withDates[i - 1]
      const curr = withDates[i]
      if (curr.dueDate! < prev.dueDate!) {
        orderWarning = `La fecha de ${STAGE_LABELS[curr.stageKey]} (${curr.dueDate}) es anterior a la de ${STAGE_LABELS[prev.stageKey]} (${prev.dueDate}).`
        break
      }
    }
    if (orderWarning && !confirmOrder) {
      return NextResponse.json({ orderWarning, requiresConfirmation: true }, { status: 409 })
    }

    // CA-046.1: advertir si alguna fecha cae en ley de garantías
    const dates = withDates.map((s) => s.dueDate as string)
    const periods = await findGuaranteePeriods(service, dates)
    if (periods.length > 0 && !confirmGuarantee) {
      const p = periods[0]
      return NextResponse.json(
        {
          guaranteeWarning: `Una o más fechas caen dentro del periodo de ley de garantías "${p.name}" (${p.starts_on} a ${p.ends_on}).${p.scope ? ` ${p.scope}` : ""}`,
          requiresConfirmation: true,
        },
        { status: 409 },
      )
    }

    // Upsert de las etapas (solo las que traen fecha; fecha null = borrar etapa)
    for (const s of stages) {
      if (!s.dueDate) {
        await service.from("process_stages").delete().eq("process_id", processId).eq("stage_key", s.stageKey)
        continue
      }
      const { data: existing } = await service
        .from("process_stages")
        .select("id, completed_at")
        .eq("process_id", processId)
        .eq("stage_key", s.stageKey)
        .maybeSingle()

      const completedAt =
        s.completed === true ? existing?.completed_at ?? new Date().toISOString() : null

      if (existing) {
        await service
          .from("process_stages")
          .update({ due_date: s.dueDate, completed_at: completedAt, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
      } else {
        await service.from("process_stages").insert({
          process_id: processId,
          stage_key: s.stageKey,
          due_date: s.dueDate,
          completed_at: completedAt,
        })
      }
    }

    // Auditoría: guardado del cronograma (y constancia de advertencias aceptadas)
    await logAuditEvent({
      action: "process_updated",
      actorId: user.id,
      processId,
      organizationId: orgId,
      details: {
        processCode: proc.code,
        stagesSaved: withDates.map((s) => `${s.stageKey}:${s.dueDate}`),
        ...(orderWarning ? { orderWarningAccepted: true } : {}),
        ...(periods.length > 0 ? { guaranteeWarningAccepted: periods[0].name } : {}),
      },
      ip: getRequestIp(request),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
