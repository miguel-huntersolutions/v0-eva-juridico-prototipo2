/**
 * CAP-03: lectura de los valores de formulario guardados de un proceso.
 * Usado para precargar el formulario al reutilizar (RF-012) y para "Copiar
 * campos" entre minutas (RF-014).
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
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
      .select("id, reused_from_process_id, entity:entities(organization_id)")
      .eq("id", processId)
      .single()
    if (procErr || !proc) return NextResponse.json({ error: "Process not found" }, { status: 404 })

    const orgId = (proc.entity as any)?.organization_id
    if ((profile.role === "admin" || profile.role === "member") && profile.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: fields, error } = await service
      .from("process_field_values")
      .select("tag, value, table_rows, origin, confirmed")
      .eq("process_id", processId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const formData: Record<string, string> = {}
    const tableData: Record<string, Array<Record<string, string>>> = {}
    const origins: Record<string, string> = {}
    const unconfirmed: string[] = []
    for (const f of fields || []) {
      if (f.table_rows) tableData[f.tag] = f.table_rows
      else if (f.value != null) formData[f.tag] = f.value
      origins[f.tag] = f.origin || "form"
      if (f.confirmed === false) unconfirmed.push(f.tag)
    }

    return NextResponse.json({
      formData,
      tableData,
      origins,
      unconfirmed,
      reusedFromProcessId: (proc as any).reused_from_process_id ?? null,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
