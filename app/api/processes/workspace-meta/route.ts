/**
 * Metadatos del listado de procesos (asesor): nombres de responsables,
 * mensajes sin leer y adjuntos. Usa service role porque RLS de profiles
 * no deja al member ver el nombre de otro abogado.
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
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

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let procQuery = service
      .from("processes")
      .select("id, assigned_to, entity_id, entity:entities(organization_id)")
      .limit(800)

    if (profile.role === "entity_contact") {
      if (!profile.entity_id) {
        return NextResponse.json({ assignees: {}, unreadByProcess: {}, messageCountByProcess: {}, attachmentCountByProcess: {} })
      }
      procQuery = procQuery.eq("entity_id", profile.entity_id)
    }

    const { data: processes, error: procErr } = await procQuery
    if (procErr) return NextResponse.json({ error: procErr.message }, { status: 500 })

    const visible = (processes || []).filter((p: any) => {
      if (profile.role === "superadmin") return true
      if (profile.role === "entity_contact") return p.entity_id === profile.entity_id
      return p.entity?.organization_id === profile.organization_id
    })
    const processIds = visible.map((p: any) => p.id)
    if (processIds.length === 0) {
      return NextResponse.json({
        assignees: {},
        unreadByProcess: {},
        messageCountByProcess: {},
        attachmentCountByProcess: {},
      })
    }

    const assigneeIds = [...new Set(visible.map((p: any) => p.assigned_to).filter(Boolean))] as string[]
    const assignees: Record<string, string> = {}
    if (assigneeIds.length > 0) {
      const { data: people } = await service.from("profiles").select("id, name, email").in("id", assigneeIds)
      for (const person of people || []) {
        assignees[person.id] = person.name || person.email || "Asesor"
      }
    }

    const unreadByProcess: Record<string, number> = {}
    const { data: unread } = await service
      .from("notifications")
      .select("process_id")
      .eq("user_id", user.id)
      .eq("type", "thread_message")
      .is("read_at", null)
      .in("process_id", processIds)
    for (const n of unread || []) {
      if (!n.process_id) continue
      unreadByProcess[n.process_id] = (unreadByProcess[n.process_id] || 0) + 1
    }

    const messageCountByProcess: Record<string, number> = {}
    const { data: msgs } = await service.from("process_messages").select("process_id").in("process_id", processIds)
    for (const m of msgs || []) {
      messageCountByProcess[m.process_id] = (messageCountByProcess[m.process_id] || 0) + 1
    }

    const attachmentCountByProcess: Record<string, number> = {}
    const { data: atts } = await service.from("process_attachments").select("process_id").in("process_id", processIds)
    for (const a of atts || []) {
      attachmentCountByProcess[a.process_id] = (attachmentCountByProcess[a.process_id] || 0) + 1
    }

    return NextResponse.json({
      assignees,
      unreadByProcess,
      messageCountByProcess,
      attachmentCountByProcess,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
