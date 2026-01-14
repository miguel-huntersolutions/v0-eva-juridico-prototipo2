import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/assign-member-entities
 * Assigns entities to a member using service role to bypass RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is superadmin or admin
    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (!profile || (profile.role !== "superadmin" && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: Only superadmins and admins can assign entities" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { memberId, entityIds } = body

    if (!memberId || !Array.isArray(entityIds)) {
      return NextResponse.json(
        { error: "Missing required fields: memberId, entityIds" },
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

    // Get member details to verify organization
    const { data: memberProfile, error: memberError } = await serviceRoleClient
      .from("profiles")
      .select("id, email, name, role, organization_id")
      .eq("id", memberId)
      .single()

    if (memberError || !memberProfile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // If user is admin (not superadmin), verify they can only assign entities to members in their own organization
    if (profile.role === "admin" && profile.organization_id !== memberProfile.organization_id) {
      return NextResponse.json(
        { error: "Forbidden: Admins can only assign entities to members in their own organization" },
        { status: 403 },
      )
    }

    // Verify all entity IDs belong to the same organization as the member
    if (entityIds.length > 0) {
      const { data: entities, error: entitiesError } = await serviceRoleClient
        .from("entities")
        .select("id, organization_id")
        .in("id", entityIds)

      if (entitiesError) {
        return NextResponse.json(
          { error: "Failed to verify entities", message: entitiesError.message },
          { status: 500 },
        )
      }

      // Check if all entities belong to the member's organization
      const invalidEntities = entities.filter((e) => e.organization_id !== memberProfile.organization_id)
      if (invalidEntities.length > 0) {
        return NextResponse.json(
          { error: "Some entities do not belong to the member's organization" },
          { status: 400 },
        )
      }
    }

    // Delete existing assignments
    const { error: deleteError } = await serviceRoleClient
      .from("member_entities")
      .delete()
      .eq("member_id", memberId)

    if (deleteError) {
      console.error("[assign-member-entities] Error deleting existing assignments:", deleteError)
      return NextResponse.json(
        { error: "Failed to clear existing assignments", message: deleteError.message },
        { status: 500 },
      )
    }

    // Insert new assignments
    if (entityIds.length > 0) {
      const assignments = entityIds.map((entityId: string) => ({
        member_id: memberId,
        entity_id: entityId,
      }))

      const { error: insertError } = await serviceRoleClient
        .from("member_entities")
        .insert(assignments)

      if (insertError) {
        console.error("[assign-member-entities] Error inserting assignments:", insertError)
        return NextResponse.json(
          { error: "Failed to save assignments", message: insertError.message },
          { status: 500 },
        )
      }
    }

    console.log(`[assign-member-entities] Successfully assigned ${entityIds.length} entities to member ${memberId}`)

    return NextResponse.json({
      success: true,
      message: `Se asignaron ${entityIds.length} entidades al miembro`,
    })
  } catch (error) {
    console.error("Error assigning member entities:", error)
    return NextResponse.json(
      {
        error: "Failed to assign entities",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

