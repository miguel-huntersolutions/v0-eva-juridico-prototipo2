/**
 * CAP-07 (RF-025/026/040): hilo de mensajes de un proceso.
 *
 * GET  → lista el hilo (autor, fecha/hora; inalterable por trigger de BD).
 * POST → publica un mensaje (y opcionalmente referencia un adjunto ya subido
 *        por /api/process-attachments), audita (RF-040) y notifica en la app
 *        a los demás participantes (RF-026). Correo vía Brevo; su fallo nunca
 *        borra el mensaje (CA-026.3).
 *
 * Acceso (CA-025.3):
 *  - superadmin: todo
 *  - admin: procesos de su organización
 *  - member: procesos de su organización si tiene acceso a la entidad
 *    (member_entities), es el responsable asignado o el creador
 *  - entity_contact: SOLO procesos de su entidad (profiles.entity_id); cualquier
 *    otro caso recibe 403
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { logAuditEvent, getRequestIp } from "@/lib/audit/log"
import { sendEmailToUserIds, wrapEmailHtml, processUrl } from "@/lib/email/brevo"

function getServiceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface ProfileRow {
  role: string
  organization_id: string | null
  entity_id: string | null
  name: string | null
}

/** Valida el acceso al hilo según el rol. Devuelve null si tiene acceso, o la respuesta de error. */
async function validateThreadAccess(
  service: SupabaseClient,
  profile: ProfileRow,
  userId: string,
  processId: string,
): Promise<{ proc: any; orgId: string } | NextResponse> {
  const { data: proc, error } = await service
    .from("processes")
    .select("id, code, entity_id, assigned_to, created_by, entity:entities(id, name, organization_id)")
    .eq("id", processId)
    .single()
  if (error || !proc) return NextResponse.json({ error: "Process not found" }, { status: 404 })

  const orgId = (proc.entity as any)?.organization_id as string | undefined

  if (profile.role === "superadmin") return { proc, orgId: orgId! }

  // CA-025.3: el contacto de entidad solo toca procesos de SU entidad
  if (profile.role === "entity_contact") {
    if (!profile.entity_id || profile.entity_id !== proc.entity_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return { proc, orgId: orgId! }
  }

  if (profile.organization_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (profile.role === "admin") return { proc, orgId: orgId! }

  // member: acceso a la entidad, responsable asignado o creador del proceso
  if (proc.assigned_to === userId || proc.created_by === userId) {
    return { proc, orgId: orgId! }
  }
  const { data: access } = await service
    .from("member_entities")
    .select("member_id")
    .eq("member_id", userId)
    .eq("entity_id", proc.entity_id)
    .maybeSingle()
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return { proc, orgId: orgId! }
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
      .select("role, organization_id, entity_id, name")
      .eq("id", user.id)
      .single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    const service = getServiceClient()
    const access = await validateThreadAccess(service, profile as ProfileRow, user.id, processId)
    if (access instanceof NextResponse) return access

    const { data: messages, error } = await service
      .from("process_messages")
      .select(
        "id, body, created_at, author:profiles!process_messages_author_id_fkey(id, name, email, role), attachment:process_attachments(id, name, file_url, mime_type)",
      )
      .eq("process_id", processId)
      .order("created_at", { ascending: true })
      .limit(500)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const mapped = (messages || []).map((m: any) => ({
      id: m.id,
      body: m.body,
      createdAt: m.created_at,
      authorId: m.author?.id ?? null,
      authorName: m.author?.name || m.author?.email || "Usuario",
      authorRole: m.author?.role ?? null,
      isMine: m.author?.id === user.id,
      attachment: m.attachment
        ? {
            id: m.attachment.id,
            name: m.attachment.name,
            fileUrl: m.attachment.file_url,
            mimeType: m.attachment.mime_type,
          }
        : null,
    }))

    return NextResponse.json({
      processCode: access.proc.code,
      entityName: (access.proc.entity as any)?.name ?? null,
      messages: mapped,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function POST(
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
      .select("role, organization_id, entity_id, name")
      .eq("id", user.id)
      .single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const text = typeof body?.body === "string" ? body.body.trim() : ""
    const attachmentId = typeof body?.attachmentId === "string" ? body.attachmentId : null
    if (!text && !attachmentId) {
      return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 })
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: "El mensaje supera el máximo de 5000 caracteres" }, { status: 400 })
    }

    const service = getServiceClient()
    const access = await validateThreadAccess(service, profile as ProfileRow, user.id, processId)
    if (access instanceof NextResponse) return access
    const { proc, orgId } = access

    // Si referencia un adjunto, validar que es del mismo proceso
    if (attachmentId) {
      const { data: att } = await service
        .from("process_attachments")
        .select("id, process_id")
        .eq("id", attachmentId)
        .single()
      if (!att || att.process_id !== processId) {
        return NextResponse.json({ error: "Adjunto inválido para este proceso" }, { status: 400 })
      }
    }

    const { data: message, error: insertErr } = await service
      .from("process_messages")
      .insert({
        process_id: processId,
        organization_id: orgId,
        author_id: user.id,
        body: text || "(adjunto)",
        attachment_id: attachmentId,
      })
      .select("id, created_at")
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    const authorName = (profile as ProfileRow).name || user.email || "Un usuario"
    const ip = getRequestIp(request)

    // RF-040: cada mensaje queda en el registro de auditoría (autor, fecha, IP, proceso)
    await logAuditEvent({
      action: "message_posted",
      actorId: user.id,
      processId,
      organizationId: orgId,
      details: { processCode: proc.code, messageId: message.id, hasAttachment: !!attachmentId },
      ip,
    })

    // RF-026: solo participantes del proceso/hilo — no todos los admins de la firma.
    // Responsable, creador, quienes ya escribieron y el contacto de ESA entidad.
    try {
      const recipients = new Set<string>()
      if (proc.assigned_to) recipients.add(proc.assigned_to as string)
      if (proc.created_by) recipients.add(proc.created_by as string)

      const [{ data: prevAuthors }, { data: contacts }] = await Promise.all([
        service.from("process_messages").select("author_id").eq("process_id", processId),
        service
          .from("profiles")
          .select("id")
          .eq("role", "entity_contact")
          .eq("entity_id", proc.entity_id)
          .eq("status", "approved"),
      ])
      for (const a of prevAuthors || []) if (a.author_id) recipients.add(a.author_id)
      for (const c of contacts || []) recipients.add(c.id)
      recipients.delete(user.id)

      if (recipients.size > 0) {
        const preview = text.length > 140 ? `${text.slice(0, 140)}…` : text
        const ids = [...recipients]
        await service.from("notifications").insert(
          ids.map((userId) => ({
            user_id: userId,
            organization_id: orgId,
            process_id: processId,
            type: "thread_message",
            title: `Nuevo mensaje en ${proc.code}`,
            body: `${authorName}: ${preview || "(adjunto)"}`,
          })),
        )
        // RF-026 / CA-026.3: correo a todos; si falla, el mensaje ya está en el hilo
        const link = processUrl(processId)
        const subject = `Nuevo mensaje en ${proc.code}`
        const mailText = `${authorName} escribió en el proceso ${proc.code}:\n\n${preview || "(adjunto)"}\n\n${link}`
        await sendEmailToUserIds(
          service,
          ids,
          {
            subject,
            text: mailText,
            html: wrapEmailHtml(
              subject,
              [`${authorName} escribió:`, preview || "(adjunto)"],
              "Abrir hilo",
              link,
            ),
          },
          { organizationId: orgId, processId, kind: "thread_message" },
        )
      }
    } catch (notifErr) {
      // CA-026.3: el fallo de notificación nunca borra el mensaje
      console.warn("[messages] No se pudo notificar:", notifErr)
    }

    return NextResponse.json({ success: true, messageId: message.id, createdAt: message.created_at })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
