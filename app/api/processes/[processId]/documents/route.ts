/**
 * CAP-02: documentos generados de un proceso (para continuar procesos parciales).
 * Devuelve los template_id que ya tienen al menos un documento generado.
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
      .select("id, entity:entities(organization_id)")
      .eq("id", processId)
      .single()
    if (procErr || !proc) return NextResponse.json({ error: "Process not found" }, { status: 404 })

    const orgId = (proc.entity as any)?.organization_id
    if ((profile.role === "admin" || profile.role === "member") && profile.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: docs, error } = await service
      .from("documents")
      .select("template_id, name, version")
      .eq("process_id", processId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const generatedTemplateIds = [
      ...new Set((docs || []).map((d: any) => d.template_id).filter(Boolean)),
    ] as string[]

    return NextResponse.json({ generatedTemplateIds, documentsCount: docs?.length ?? 0 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
