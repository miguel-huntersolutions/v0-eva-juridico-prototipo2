import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

/**
 * PUT /api/update-document
 * Updates a document status (approve/reject) using service role to bypass RLS
 */
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 },
      )
    }

    if (profile.role !== "superadmin" && profile.role !== "admin" && profile.role !== "member") {
      return NextResponse.json(
        { error: "Forbidden: Invalid user role" },
        { status: 403 },
      )
    }

    // Extract request body
    const body = await request.json()
    const { documentId, status, comment } = body

    // Members can set status to "pending" (send to review) or "draft" (only when doc is rejected, to correct it).
    if (profile.role === "member" && status !== "pending" && status !== "draft") {
      return NextResponse.json(
        { error: "Forbidden: Members can only send to review (pending) or reopen as draft when rejected" },
        { status: 403 },
      )
    }

    // Admin and superadmin cannot set "pending" — only the member who created the doc sends to review.
    if ((profile.role === "admin" || profile.role === "superadmin") && status === "pending") {
      return NextResponse.json(
        { error: "Forbidden: Solo el miembro que creó el documento puede enviarlo a revisión" },
        { status: 403 },
      )
    }

    if (!documentId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: documentId, status" },
        { status: 400 },
      )
    }

    if (!["draft", "pending", "in_review", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: draft, pending, in_review, approved, rejected" },
        { status: 400 },
      )
    }

    // Use service role client to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error: Service role key not configured" },
        { status: 500 },
      )
    }

    const serviceRoleClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get document details to verify it belongs to the organization
    const { data: document, error: docError } = await serviceRoleClient
      .from("documents")
      .select(`
        *,
        process:processes(
          entity:entities(organization_id)
        )
      `)
      .eq("id", documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Member can set "draft" only when the document is currently "rejected" (to correct and resubmit).
    if (profile.role === "member" && status === "draft" && document.status !== "rejected") {
      return NextResponse.json(
        { error: "Solo puede volver a borrador un documento que esté rechazado" },
        { status: 403 },
      )
    }

    // Verify document belongs to user's organization (if admin or member, not superadmin)
    const documentOrgId = (document.process as any)?.entity?.organization_id
    if ((profile.role === "admin" || profile.role === "member") && profile.organization_id !== documentOrgId) {
      return NextResponse.json(
        { error: "Forbidden: You can only update documents in your own organization" },
        { status: 403 },
      )
    }

    // Update the document
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    const previousStatus = document.status as string

    const { data: updatedDocument, error: updateError } = await serviceRoleClient
      .from("documents")
      .update(updateData)
      .eq("id", documentId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update document", message: updateError.message },
        { status: 500 },
      )
    }

    // Audit log: record status transition (including rejection/approval comments)
    const { data: profileRow } = await serviceRoleClient
      .from("profiles")
      .select("name, role")
      .eq("id", user.id)
      .single()
    const changedByName = (profileRow as any)?.name ?? user.email ?? null
    const changedByRole = (profileRow as any)?.role ?? profile?.role ?? null

    await serviceRoleClient.from("document_audit_log").insert({
      document_id: documentId,
      from_status: previousStatus,
      to_status: status,
      changed_by: user.id,
      changed_by_name: changedByName,
      changed_by_role: changedByRole,
      comment: typeof comment === "string" ? comment.trim() || null : null,
    })

    // When approved, ingest document into RAG (vector store) so the assistant can search it
    if (status === "approved") {
      try {
        const { ingestDocumentToRag } = await import("../../../lib/rag/ingest")
        const result = await ingestDocumentToRag(documentId, user.id)
        if (!result.success) {
          // Document is still approved; ingest failure is non-fatal
        }
      } catch {
        // Do not fail the request; document is already approved
      }
    }

    return NextResponse.json({
      success: true,
      document: updatedDocument,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to update document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

