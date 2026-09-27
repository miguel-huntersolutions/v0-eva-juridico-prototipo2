/**
 * RF-016 (CAP-04): historial de versiones de un documento.
 * Devuelve todas las versiones (mismo proceso + mismo nombre), ordenadas.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params
    if (!documentId) return NextResponse.json({ error: "documentId is required" }, { status: 400 })

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Documento actual → proceso + nombre + org
    const { data: doc, error: docError } = await service
      .from("documents")
      .select("id, name, process_id, process:processes(entity:entities(organization_id))")
      .eq("id", documentId)
      .single()

    if (docError || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    const orgId = (doc.process as any)?.entity?.organization_id
    if ((profile.role === "admin" || profile.role === "member") && profile.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Todas las versiones del mismo documento (mismo proceso + nombre)
    const { data: versions, error } = await service
      .from("documents")
      .select("id, version, status, file_url, file_size, created_at, created_by, creator:profiles(name)")
      .eq("process_id", doc.process_id)
      .eq("name", doc.name)
      .order("version", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const mapped = (versions || []).map((v: any) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      fileUrl: v.file_url,
      fileSize: v.file_size,
      createdAt: v.created_at,
      createdByName: v.creator?.name || null,
      isCurrent: v.id === documentId,
    }))

    return NextResponse.json({ documentName: doc.name, versions: mapped })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
