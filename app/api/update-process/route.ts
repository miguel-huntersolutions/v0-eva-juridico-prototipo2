import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

/**
 * PUT /api/update-process
 * Updates a process status using service role to bypass RLS
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
    const { processId, status } = body

    if (!processId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: processId, status" },
        { status: 400 },
      )
    }

    if (!["draft", "in_progress", "review", "completed", "archived"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: draft, in_progress, review, completed, archived" },
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

    // Get process details to verify it belongs to the organization
    const { data: processData, error: procError } = await serviceRoleClient
      .from("processes")
      .select(`
        *,
        entity:entities(organization_id)
      `)
      .eq("id", processId)
      .single()

    if (procError || !processData) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    // Verify process belongs to user's organization (if admin or member, not superadmin)
    const processOrgId = (processData.entity as any)?.organization_id
    if ((profile.role === "admin" || profile.role === "member") && profile.organization_id !== processOrgId) {
      return NextResponse.json(
        { error: "Forbidden: You can only update processes in your own organization" },
        { status: 403 },
      )
    }

    // Update the process
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    const { data: updatedProcess, error: updateError } = await serviceRoleClient
      .from("processes")
      .update(updateData)
      .eq("id", processId)
      .select()
      .single()

    if (updateError) {
      console.error("[update-process] Error updating process:", updateError)
      return NextResponse.json(
        { error: "Failed to update process", message: updateError.message },
        { status: 500 },
      )
    }

    console.log(`[update-process] Process ${processId} updated to status: ${status}`)

    return NextResponse.json({
      success: true,
      process: updatedProcess,
    })
  } catch (error) {
    console.error("Error updating process:", error)
    return NextResponse.json(
      {
        error: "Failed to update process",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

