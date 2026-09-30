/**
 * CAP-07 (CA-025.2): vista general del canal de comunicación.
 * Lista las conversaciones (procesos con hilo) visibles para el usuario,
 * ordenadas por último mensaje, con código y entidad del proceso.
 *
 * - admin/superadmin: todos los procesos de la organización
 * - member: procesos donde es responsable, creador o tiene acceso a la entidad
 * - entity_contact: solo procesos de SU entidad (CA-025.3)
 */

import { NextRequest, NextResponse } from "next/server"
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
      .select("role, organization_id, entity_id")
      .eq("id", user.id)
      .single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Procesos visibles según el rol
    let procQuery = service
      .from("processes")
      .select("id, code, entity_id, assigned_to, created_by, entity:entities(name, organization_id)")
      .order("updated_at", { ascending: false })
      .limit(500)

    if (profile.role === "entity_contact") {
      if (!profile.entity_id) return NextResponse.json({ conversations: [] })
      procQuery = procQuery.eq("entity_id", profile.entity_id)
    } else if (profile.role !== "superadmin") {
      // admin/member: procesos de su org (filtrado por entidades de la org abajo)
    }

    const { data: processes, error: procErr } = await procQuery
    if (procErr) return NextResponse.json({ error: procErr.message }, { status: 500 })

    let visible = (processes || []).filter((p: any) => {
      const orgId = p.entity?.organization_id
      if (profile.role === "superadmin") return true
      if (profile.role === "entity_contact") return p.entity_id === profile.entity_id
      return orgId === profile.organization_id
    })

    // member: reducir a los que creó, tiene asignados o cuya entidad tiene acceso
    if (profile.role === "member") {
      const { data: access } = await service
        .from("member_entities")
        .select("entity_id")
        .eq("member_id", user.id)
      const entityAccess = new Set((access || []).map((a) => a.entity_id))
      visible = visible.filter(
        (p: any) => p.created_by === user.id || p.assigned_to === user.id || entityAccess.has(p.entity_id),
      )
    }

    if (visible.length === 0) return NextResponse.json({ conversations: [] })

    // 2. Último mensaje y conteo por proceso
    const processIds = visible.map((p: any) => p.id)
    const { data: messages, error: msgErr } = await service
      .from("process_messages")
      .select("process_id, body, created_at, author:profiles!process_messages_author_id_fkey(full_name, email)")
      .in("process_id", processIds)
      .order("created_at", { ascending: false })
      .limit(2000)
    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

    const lastByProcess: Record<string, any> = {}
    const countByProcess: Record<string, number> = {}
    for (const m of messages || []) {
      countByProcess[m.process_id] = (countByProcess[m.process_id] || 0) + 1
      if (!lastByProcess[m.process_id]) lastByProcess[m.process_id] = m // ya vienen desc
    }

    const conversations = visible
      .map((p: any) => {
        const last = lastByProcess[p.id]
        return {
          processId: p.id,
          processCode: p.code,
          entityName: p.entity?.name ?? "",
          messageCount: countByProcess[p.id] || 0,
          lastMessageAt: last?.created_at ?? null,
          lastMessagePreview: last ? String(last.body).slice(0, 120) : null,
          lastMessageAuthor: last?.author?.full_name || last?.author?.email || null,
        }
      })
      // CA-025.2: ordenadas por último mensaje; sin mensajes al final
      .sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0
        if (!a.lastMessageAt) return 1
        if (!b.lastMessageAt) return -1
        return b.lastMessageAt.localeCompare(a.lastMessageAt)
      })

    return NextResponse.json({ conversations })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
