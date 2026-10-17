/**
 * CAP-11 (RF-046): periodos de ley de garantías por organización.
 *
 * GET    → periodos de la org del usuario (EVA / UI).
 * POST   → crea (solo org-superadmin de esa org).
 * DELETE → elimina (solo org-superadmin dueño del periodo).
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getProfile() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single()
  return { user, profile }
}

function isOrgSuperadmin(profile: { role?: string | null; organization_id?: string | null } | null) {
  return profile?.role === "superadmin" && !!profile.organization_id
}

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getProfile()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(request.url)
    const orgParam = url.searchParams.get("orgId")
    // Org-SA / admin / member: solo su org (nunca la de orgId). Plataforma puede pedir orgId explícito (solo lectura).
    const orgId =
      profile?.role === "superadmin" && !profile.organization_id ? orgParam : profile?.organization_id

    if (!orgId) {
      return NextResponse.json({ error: "organization_id is required" }, { status: 400 })
    }

    const service = getServiceClient()
    const { data, error } = await service
      .from("guarantee_law_periods")
      .select("id, name, starts_on, ends_on, scope, organization_id, created_at")
      .eq("organization_id", orgId)
      .order("starts_on", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ periods: data || [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getProfile()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isOrgSuperadmin(profile)) {
      return NextResponse.json(
        { error: "Solo el superadministrador de la organización administra los periodos de restricción" },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const startsOn = typeof body?.startsOn === "string" ? body.startsOn : ""
    const endsOn = typeof body?.endsOn === "string" ? body.endsOn : ""
    const scope = typeof body?.scope === "string" ? body.scope.trim() : null

    if (!name || !startsOn || !endsOn) {
      return NextResponse.json({ error: "name, startsOn y endsOn son obligatorios" }, { status: 400 })
    }
    if (endsOn < startsOn) {
      return NextResponse.json({ error: "La fecha de fin no puede ser anterior a la de inicio" }, { status: 400 })
    }

    const organizationId = profile!.organization_id as string
    const service = getServiceClient()
    const { data, error } = await service
      .from("guarantee_law_periods")
      .insert({
        name,
        starts_on: startsOn,
        ends_on: endsOn,
        scope,
        organization_id: organizationId,
        created_by: user.id,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, period: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, profile } = await getProfile()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isOrgSuperadmin(profile)) {
      return NextResponse.json(
        { error: "Solo el superadministrador de la organización administra los periodos de restricción" },
        { status: 403 },
      )
    }

    const id = new URL(request.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    const service = getServiceClient()
    const { data: existing } = await service
      .from("guarantee_law_periods")
      .select("id, organization_id")
      .eq("id", id)
      .maybeSingle()

    if (!existing || existing.organization_id !== profile!.organization_id) {
      return NextResponse.json({ error: "Periodo no encontrado" }, { status: 404 })
    }

    const { error } = await service.from("guarantee_law_periods").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
