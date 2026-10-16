import { NextRequest, NextResponse } from "next/server"
import {
  ORGANIZATION_SELECT,
  authorizeOrganizationAdmin,
  parseOrganizationUpdate,
} from "@/lib/organization-settings"

/**
 * GET /api/organization-settings?organizationId=
 * Devuelve los datos editables de la organización (admin de la organización o superadmin).
 */
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId")
    const auth = await authorizeOrganizationAdmin(organizationId)
    if (!auth.ok) return auth.response

    const { data, error } = await auth.serviceClient
      .from("organizations")
      .select(ORGANIZATION_SELECT)
      .eq("id", organizationId!)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Organization not found", message: error?.message }, { status: 404 })
    }
    return NextResponse.json({ success: true, organization: data })
  } catch (error) {
    console.error("[organization-settings] GET error:", error)
    return NextResponse.json({ error: "Failed to load organization" }, { status: 500 })
  }
}

/**
 * PUT /api/organization-settings
 * Body: { organizationId, name?, nit?, email?, phone?, address?, website?, primary_color?, secondary_color?, logo_url? }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const organizationId = typeof body.organizationId === "string" ? body.organizationId : null

    const auth = await authorizeOrganizationAdmin(organizationId)
    if (!auth.ok) return auth.response

    const parsed = parseOrganizationUpdate(body)
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { data, error } = await auth.serviceClient
      .from("organizations")
      .update(parsed.data)
      .eq("id", organizationId!)
      .select(ORGANIZATION_SELECT)
      .single()

    if (error) {
      const status = error.code === "23505" ? 409 : 500
      const message = error.code === "23505" ? "Ya existe una organización con ese NIT" : error.message
      return NextResponse.json({ error: "Failed to update organization", message }, { status })
    }
    return NextResponse.json({ success: true, organization: data })
  } catch (error) {
    console.error("[organization-settings] PUT error:", error)
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 })
  }
}
