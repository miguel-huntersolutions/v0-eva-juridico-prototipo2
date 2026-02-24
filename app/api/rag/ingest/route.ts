/**
 * POST /api/rag/ingest
 * Ingest a document into the RAG vector store (download from Drive, upload to OpenAI).
 * Body: { documentId: string }
 * Only admin/superadmin or the document's org can trigger ingest.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { ingestDocumentToRag } from "@/lib/rag/ingest"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 })
    }

    if (profile.role !== "superadmin" && profile.role !== "admin" && profile.role !== "member") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const documentId = body?.documentId
    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: document, error: docError } = await service
      .from("documents")
      .select(`
        id,
        process:processes(entity:entities(organization_id))
      `)
      .eq("id", documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const docOrgId = (document.process as any)?.entity?.organization_id
    if ((profile.role === "admin" || profile.role === "member") && profile.organization_id !== docOrgId) {
      return NextResponse.json({ error: "Forbidden: document belongs to another organization" }, { status: 403 })
    }

    const result = await ingestDocumentToRag(documentId, user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: "Ingestion failed", message: result.error },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      openaiFileId: result.openaiFileId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Ingestion failed", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
