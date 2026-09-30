/**
 * CAP-09 (RF-031/RF-032): consulta y exportación del registro de auditoría.
 *
 * SOLO admin de la organización o superadmin (CA-031.3: un member recibe 403).
 *
 * Query params:
 *   processId  → eventos de un proceso
 *   entityId   → eventos de todos los procesos de la entidad
 *   from, to   → rango de fechas (YYYY-MM-DD), inclusive
 *   format=csv → exporta CSV con las mismas columnas de la pantalla y
 *                cabecera con entidad y rango (CA-032.1)
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

const ACTION_LABELS: Record<string, string> = {
  process_created: "Proceso creado",
  process_updated: "Proceso actualizado",
  process_deleted: "Proceso eliminado",
  process_reused: "Proceso reutilizado",
  process_assigned: "Proceso asignado",
  process_unassigned: "Responsable retirado",
  status_changed: "Cambio de estado",
  draft_saved: "Borrador guardado",
  document_generated: "Documento generado",
  document_regenerated: "Documento regenerado",
  document_opened: "Documento abierto",
  document_downloaded: "Documento descargado",
  document_sent_to_review: "Enviado a revisión",
  document_approved: "Documento aprobado",
  document_rejected: "Documento rechazado",
  document_reopened: "Documento vuelto a borrador",
  attachment_uploaded: "Adjunto cargado",
  entity_access_granted: "Acceso a entidad otorgado",
  member_invited: "Miembro invitado",
  message_posted: "Mensaje en el hilo",
  email_failed: "Fallo al enviar correo",
  login: "Inicio de sesión",
  eva_query: "Consulta a EVA",
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(request: NextRequest) {
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

    // CA-031.3: un asesor (member) no puede abrir el registro de auditoría
    if (profile.role !== "admin" && profile.role !== "superadmin") {
      return NextResponse.json({ error: "Solo el administrador puede consultar la auditoría" }, { status: 403 })
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const url = new URL(request.url)
    const processId = url.searchParams.get("processId")
    const entityId = url.searchParams.get("entityId")
    const from = url.searchParams.get("from") // YYYY-MM-DD
    const to = url.searchParams.get("to")
    const format = url.searchParams.get("format")

    // Organización a consultar: la del admin; el superadmin puede pasar orgId
    const orgId =
      profile.role === "superadmin"
        ? url.searchParams.get("orgId") || profile.organization_id
        : profile.organization_id
    if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 })

    // Si filtra por entidad: procesos de esa entidad (para mapear eventos)
    let entityName: string | null = null
    let processIdsForEntity: string[] | null = null
    if (entityId) {
      const { data: entity } = await service
        .from("entities")
        .select("id, name, organization_id")
        .eq("id", entityId)
        .single()
      if (!entity || entity.organization_id !== orgId) {
        return NextResponse.json({ error: "Entity not found" }, { status: 404 })
      }
      entityName = entity.name
      const { data: procs } = await service.from("processes").select("id").eq("entity_id", entityId)
      processIdsForEntity = (procs || []).map((p) => p.id)
    }

    let query = service
      .from("audit_log")
      .select(
        "id, action, details, ip, created_at, process_id, document_id, actor:profiles!audit_log_actor_id_fkey(full_name, email), process:processes(code)",
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(2000)

    if (processId) query = query.eq("process_id", processId)
    if (processIdsForEntity) {
      // Eventos ligados a procesos de la entidad + eventos de acceso a la entidad
      if (processIdsForEntity.length > 0) {
        query = query.in("process_id", processIdsForEntity)
      } else {
        query = query.eq("process_id", "00000000-0000-0000-0000-000000000000") // sin procesos: vacío
      }
    }
    if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`)
    if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`)

    const { data: events, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const mapped = (events || []).map((e: any) => ({
      id: e.id,
      action: e.action as string,
      actionLabel: ACTION_LABELS[e.action] ?? e.action,
      actorName: e.actor?.full_name || e.actor?.email || "Usuario desconocido",
      processCode: e.process?.code ?? null,
      processId: e.process_id,
      documentId: e.document_id,
      details: e.details,
      ip: e.ip,
      createdAt: e.created_at,
    }))

    if (format === "csv") {
      const now = new Date()
      const headerLines = [
        "# Registro de auditoria - EVA Juridico",
        entityName ? `# Entidad: ${entityName}` : null,
        from || to ? `# Rango: ${from || "inicio"} a ${to || "hoy"}` : null,
        `# Generado: ${now.toISOString()}`,
        `# Total de eventos: ${mapped.length}`,
        "",
      ].filter((l): l is string => l !== null)

      const columns = ["Fecha", "Hora", "Usuario", "Accion", "Proceso", "Detalle", "IP"]
      const rows = mapped.map((e) => {
        const d = new Date(e.createdAt)
        const detalle = e.details
          ? Object.entries(e.details)
              .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
              .join("; ")
          : ""
        return [
          d.toISOString().split("T")[0],
          d.toISOString().split("T")[1]?.slice(0, 8) ?? "",
          e.actorName,
          e.actionLabel,
          e.processCode ?? "",
          detalle,
          e.ip ?? "",
        ]
      })

      const csv =
        headerLines.join("\n") +
        "\n" +
        columns.map(csvEscape).join(",") +
        "\n" +
        rows.map((r) => r.map(csvEscape).join(",")).join("\n")

      const filename = `auditoria${entityName ? `-${entityName.replace(/\s+/g, "-").toLowerCase()}` : ""}-${now.toISOString().split("T")[0]}.csv`
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json({ events: mapped, total: mapped.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
