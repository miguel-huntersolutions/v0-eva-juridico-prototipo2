/**
 * CAP-08 (RF-029): notificaciones in-app del usuario autenticado.
 *
 * GET   /api/notifications          → últimas 30 (no leídas primero) + unreadCount
 * PATCH /api/notifications          → marcar como leídas: { id } o { all: true }
 *
 * La notificación por correo queda pendiente: no hay email transaccional
 * configurado (Supabase Auth solo envía invitaciones). Ver SDD RF-029.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, process_id, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30)

    if (error) {
      // Si la tabla aún no existe (SQL 038 no ejecutado), devolver vacío en vez de 500
      console.error("[notifications] Error loading:", error.message)
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

    const notifications = (data || []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      processId: n.process_id,
      read: !!n.read_at,
      createdAt: n.created_at,
    }))
    const unreadCount = notifications.filter((n) => !n.read).length

    return NextResponse.json({ notifications, unreadCount })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const now = new Date().toISOString()

    let query = supabase.from("notifications").update({ read_at: now }).is("read_at", null)
    if (body?.all === true) {
      // Marcar todas las del usuario (RLS limita a las propias)
      query = query.eq("user_id", user.id)
    } else if (typeof body?.id === "string") {
      query = query.eq("id", body.id)
    } else if (typeof body?.processId === "string") {
      query = query.eq("user_id", user.id).eq("process_id", body.processId)
      if (typeof body?.type === "string") query = query.eq("type", body.type)
    } else {
      return NextResponse.json({ error: "Missing id, processId or all" }, { status: 400 })
    }

    const { error } = await query
    if (error) {
      console.error("[notifications] Error marking read:", error.message)
      return NextResponse.json({ error: "No se pudo marcar como leída" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
