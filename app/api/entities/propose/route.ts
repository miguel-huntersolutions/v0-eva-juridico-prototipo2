/**
 * CAP-10 (RF-035): un asesor propone una entidad nueva.
 * Queda en estado "pending" (NO aparece en el selector de procesos — CA-035.2)
 * y los administradores de la organización reciben la notificación.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { logAuditEvent, getRequestIp } from "@/lib/audit/log"
import { sendEmailToUserIds, wrapEmailHtml, entitiesAdminUrl } from "@/lib/email/brevo"

export async function POST(request: NextRequest) {
  try {
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
    if (profile.role !== "member" && profile.role !== "admin") {
      return NextResponse.json({ error: "Solo los asesores y administradores proponen entidades" }, { status: 403 })
    }
    if (!profile.organization_id) {
      return NextResponse.json({ error: "El usuario no tiene organización" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const nit = typeof body?.nit === "string" ? body.nit.trim() : ""
    const representativeName =
      typeof body?.representativeName === "string" ? body.representativeName.trim() : ""

    if (!name || !nit || !representativeName) {
      return NextResponse.json(
        { error: "Nombre, NIT y representante legal son obligatorios" },
        { status: 400 },
      )
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Evitar duplicados: misma org, mismo NIT o mismo nombre (activa o pendiente)
    const { data: sameNit } = await service
      .from("entities")
      .select("id, name, nit, status")
      .eq("organization_id", profile.organization_id)
      .in("status", ["active", "pending"])
      .eq("nit", nit)
      .limit(1)
    const { data: sameName } = await service
      .from("entities")
      .select("id, name, nit, status")
      .eq("organization_id", profile.organization_id)
      .in("status", ["active", "pending"])
      .ilike("name", name)
      .limit(1)
    const duplicate = sameNit?.[0] || sameName?.[0]
    if (duplicate) {
      return NextResponse.json(
        {
          error: `Ya existe una entidad ${duplicate.status === "pending" ? "pendiente de aprobación" : "activa"} con ese nombre o NIT: ${duplicate.name}`,
        },
        { status: 409 },
      )
    }

    const { data: entity, error } = await service
      .from("entities")
      .insert({
        name,
        nit,
        representative_name: representativeName,
        organization_id: profile.organization_id,
        status: "pending",
        proposed_by: user.id,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notificar a los administradores de la organización (CA-035.2)
    try {
      const { data: admins } = await service
        .from("profiles")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .eq("role", "admin")
        .eq("status", "approved")
      if (admins && admins.length > 0) {
        const adminIds = admins.map((a) => a.id)
        await service.from("notifications").insert(
          adminIds.map((id) => ({
            user_id: id,
            organization_id: profile.organization_id,
            type: "entity_proposed",
            title: `Entidad propuesta: ${name}`,
            body: `${profile.name || "Un asesor"} propuso la entidad "${name}" (NIT ${nit}). Revísala en Entidades.`,
          })),
        )
        const link = entitiesAdminUrl()
        const subject = `Entidad propuesta: ${name}`
        const text = `${profile.name || "Un asesor"} propuso la entidad "${name}" (NIT ${nit}).`
        await sendEmailToUserIds(
          service,
          adminIds,
          {
            subject,
            text: `${text} Revísala en EVA: ${link}`,
            html: wrapEmailHtml(subject, [text], "Revisar entidades", link),
          },
          { organizationId: profile.organization_id, kind: "entity_proposed" },
        )
      }
    } catch (notifErr) {
      console.warn("[propose-entity] No se pudo notificar:", notifErr)
    }

    await logAuditEvent({
      action: "process_updated",
      actorId: user.id,
      organizationId: profile.organization_id,
      details: { entityProposed: name, nit },
      ip: getRequestIp(request),
    })

    return NextResponse.json({ success: true, entity: { id: entity.id, name: entity.name, status: "pending" } })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
