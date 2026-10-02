/**
 * CAP-08 (RF-028/RF-029): asignar o reasignar el abogado responsable de un proceso.
 *
 * - SOLO admin de la organización (o superadmin): un member recibe 403 (CA-028.4).
 * - Un único responsable: asignar a otro reemplaza al anterior (CA-028.3).
 * - Otorga acceso a la entidad del proceso si el abogado no lo tenía (CA-028.2)
 *   y ese cambio de acceso queda en auditoría.
 * - Notifica en la aplicación al nuevo responsable (y al anterior si es
 *   reasignación). Correo transaccional vía Brevo (RF-029); si falla, la
 *   asignación queda y el error se registra en auditoría.
 *
 * Body: { assigneeId: string | null }  (null = quitar responsable)
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { logAuditEvent, getRequestIp } from "@/lib/audit/log"
import { sendEmailToUserIds, wrapEmailHtml, processUrl } from "@/lib/email/brevo"

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
      .select("role, organization_id, name")
      .eq("id", user.id)
      .single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    // CA-028.4: ningún rol distinto de administrador puede asignar ni reasignar
    if (profile.role !== "admin" && profile.role !== "superadmin") {
      return NextResponse.json({ error: "Solo el administrador puede asignar procesos" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const assigneeId: string | null =
      typeof body?.assigneeId === "string" && body.assigneeId ? body.assigneeId : null

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Proceso + org + entidad
    const { data: proc, error: procErr } = await service
      .from("processes")
      .select("id, code, entity_id, assigned_to, entity:entities(id, name, organization_id)")
      .eq("id", processId)
      .single()
    if (procErr || !proc) return NextResponse.json({ error: "Process not found" }, { status: 404 })

    const orgId = (proc.entity as any)?.organization_id
    if (profile.role === "admin" && profile.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Validar que el abogado destino es miembro de la misma organización
    let assigneeName: string | null = null
    if (assigneeId) {
      const { data: assignee, error: asgErr } = await service
        .from("profiles")
        .select("id, name, email, organization_id, role")
        .eq("id", assigneeId)
        .single()
      if (asgErr || !assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 404 })
      if (assignee.organization_id !== orgId) {
        return NextResponse.json({ error: "El abogado debe pertenecer a la organización" }, { status: 400 })
      }
      if (assignee.role !== "member" && assignee.role !== "admin") {
        return NextResponse.json(
          { error: "Solo se puede asignar a un asesor o administrador de la firma" },
          { status: 400 },
        )
      }
      assigneeName = assignee.name || assignee.email || null
    }

    const previousAssignee = (proc as any).assigned_to as string | null
    const now = new Date().toISOString()

    // Actualizar la asignación (un solo responsable: reemplaza al anterior)
    const { error: updErr } = await service
      .from("processes")
      .update({
        assigned_to: assigneeId,
        assigned_at: assigneeId ? now : null,
        assigned_by: assigneeId ? user.id : null,
        updated_at: now,
      })
      .eq("id", processId)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // CA-028.2: otorgar acceso a la entidad del proceso si no lo tenía
    let accessGranted = false
    if (assigneeId) {
      const { data: existingAccess } = await service
        .from("member_entities")
        .select("member_id")
        .eq("member_id", assigneeId)
        .eq("entity_id", proc.entity_id)
        .maybeSingle()
      if (!existingAccess) {
        const { error: accessErr } = await service
          .from("member_entities")
          .insert({ member_id: assigneeId, entity_id: proc.entity_id })
        if (!accessErr) accessGranted = true
      }
    }

    // CAP-09 (RF-031): auditoría de asignación y del cambio de acceso
    const ip = getRequestIp(request)
    await logAuditEvent({
      organizationId: orgId,
      processId,
      actorId: user.id,
      action: assigneeId ? "process_assigned" : "process_unassigned",
      details: {
        processCode: proc.code,
        assigneeId,
        assigneeName,
        previousAssigneeId: previousAssignee,
        reassigned: !!previousAssignee && previousAssignee !== assigneeId,
      },
      ip,
    })
    if (accessGranted && assigneeId) {
      await logAuditEvent({
        organizationId: orgId,
        processId,
        actorId: user.id,
        action: "entity_access_granted",
        details: {
          processCode: proc.code,
          granteeId: assigneeId,
          granteeName: assigneeName,
          entityId: proc.entity_id,
          entityName: (proc.entity as any)?.name ?? null,
          reason: "process_assignment",
        },
        ip,
      })
    }

    // RF-029: notificación en la aplicación y por correo (Brevo) al nuevo
    // responsable (y al anterior si es reasignación). El fallo de correo no
    // bloquea la asignación; queda en auditoría (email_failed).
    const notifications: Array<Record<string, unknown>> = []
    const entityName = (proc.entity as any)?.name ?? "entidad"
    const actorName = profile.name || "El administrador"
    if (assigneeId) {
      const title = `Se te asignó el proceso ${proc.code}`
      const body = `${actorName} te asignó el proceso ${proc.code} (${entityName}).`
      notifications.push({
        user_id: assigneeId,
        organization_id: orgId,
        process_id: processId,
        type: previousAssignee && previousAssignee !== assigneeId ? "process_reassigned" : "process_assigned",
        title,
        body,
      })
    }
    if (previousAssignee && previousAssignee !== assigneeId) {
      notifications.push({
        user_id: previousAssignee,
        organization_id: orgId,
        process_id: processId,
        type: "process_unassigned",
        title: `El proceso ${proc.code} fue reasignado`,
        body: `El proceso ${proc.code} fue reasignado a ${assigneeName ?? "otro abogado"} por ${actorName}.`,
      })
    }
    if (notifications.length > 0) {
      try {
        await service.from("notifications").insert(notifications)
      } catch (notifErr) {
        console.warn("[assign] No se pudo crear la notificación:", notifErr)
      }
    }

    const link = processUrl(processId)
    if (assigneeId) {
      const subject = `Se te asignó el proceso ${proc.code}`
      const text = `${actorName} te asignó el proceso ${proc.code} (${entityName}).`
      await sendEmailToUserIds(
        service,
        [assigneeId],
        {
          subject,
          text: `${text} Ábrelo en EVA: ${link}`,
          html: wrapEmailHtml(subject, [text], "Abrir proceso", link),
        },
        { organizationId: orgId, processId, kind: "process_assigned" },
      )
    }
    if (previousAssignee && previousAssignee !== assigneeId) {
      const subject = `El proceso ${proc.code} fue reasignado`
      const text = `El proceso ${proc.code} (${entityName}) fue reasignado a ${assigneeName ?? "otro abogado"} por ${actorName}.`
      await sendEmailToUserIds(
        service,
        [previousAssignee],
        {
          subject,
          text,
          html: wrapEmailHtml(subject, [text], "Abrir proceso", link),
        },
        { organizationId: orgId, processId, kind: "process_unassigned" },
      )
    }

    return NextResponse.json({
      success: true,
      processId,
      assignedTo: assigneeId,
      assigneeName,
      accessGranted,
      reassigned: !!previousAssignee && previousAssignee !== assigneeId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
