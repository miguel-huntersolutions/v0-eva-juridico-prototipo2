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

    // Members can only set status to "pending" (send to review)
    // Admins and superadmins can set any status
    if (profile.role === "member" && status !== "pending") {
      return NextResponse.json(
        { error: "Forbidden: Members can only send documents to review (pending status)" },
        { status: 403 },
      )
    }

    if (!documentId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: documentId, status" },
        { status: 400 },
      )
    }

    if (!["draft", "pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: draft, pending, approved, rejected" },
        { status: 400 },
      )
    }

    // Use service role client to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not configured")
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

    // Add comment if provided (you might want to store this in a separate table)
    if (comment) {
      // For now, we'll store it in a metadata field if your schema supports it
      // Otherwise, you might need to create a document_comments table
    }

    const { data: updatedDocument, error: updateError } = await serviceRoleClient
      .from("documents")
      .update(updateData)
      .eq("id", documentId)
      .select()
      .single()

    if (updateError) {
      console.error("[update-document] Error updating document:", updateError)
      return NextResponse.json(
        { error: "Failed to update document", message: updateError.message },
        { status: 500 },
      )
    }

    console.log(`[update-document] Document ${documentId} updated to status: ${status}`)

    return NextResponse.json({
      success: true,
      document: updatedDocument,
    })
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json(
      {
        error: "Failed to update document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

