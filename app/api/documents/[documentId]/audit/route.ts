/**
 * GET /api/documents/[documentId]/audit
 * Returns the audit log (status transitions + comments) for a document.
 * User must have access to the document's organization.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  in_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    }

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

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get document and its organization
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

    const { data: rows, error: auditError } = await service
      .from("document_audit_log")
      .select("id, from_status, to_status, changed_by_name, changed_by_role, comment, created_at")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })

    if (auditError) {
      return NextResponse.json(
        { error: "Failed to load audit log", message: auditError.message },
        { status: 500 }
      )
    }

    const audit = (rows || []).map((row: any) => ({
      id: row.id,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      fromStatusLabel: STATUS_LABELS[row.from_status] ?? row.from_status,
      toStatusLabel: STATUS_LABELS[row.to_status] ?? row.to_status,
      changedByName: row.changed_by_name,
      changedByRole: row.changed_by_role,
      comment: row.comment,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ audit })
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load audit", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
