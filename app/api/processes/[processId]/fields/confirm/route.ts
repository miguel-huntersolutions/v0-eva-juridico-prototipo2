/**
 * RF-013 (CAP-03): confirmar los campos de un proceso reutilizado.
 * Marca confirmed=true en todos los campos del proceso tras la revisión
 * explícita de entidad, fechas y cuantías antes de generar.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

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
      .select("role, organization_id")
      .eq("id", user.id)
      .single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: proc, error: procErr } = await service
      .from("processes")
      .select("id, entity:entities(organization_id)")
      .eq("id", processId)
      .single()
    if (procErr || !proc) return NextResponse.json({ error: "Process not found" }, { status: 404 })

    const orgId = (proc.entity as any)?.organization_id
    if ((profile.role === "admin" || profile.role === "member") && profile.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await service
      .from("process_field_values")
      .update({ confirmed: true, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("process_id", processId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
