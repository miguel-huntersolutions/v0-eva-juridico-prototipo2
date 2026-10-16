import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"

/** Campos de la organización que un admin puede editar desde /admin/organization. */
export const EDITABLE_ORGANIZATION_FIELDS = [
  "name",
  "nit",
  "email",
  "phone",
  "address",
  "website",
  "primary_color",
  "secondary_color",
  "logo_url",
] as const

export type EditableOrganizationField = (typeof EDITABLE_ORGANIZATION_FIELDS)[number]

export const ORGANIZATION_SELECT = `id, name, nit, status, ${EDITABLE_ORGANIZATION_FIELDS.filter(
  (f) => f !== "name" && f !== "nit",
).join(", ")}`

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const MAX_TEXT_LENGTH = 300

type AuthResult = { ok: true; serviceClient: SupabaseClient } | { ok: false; response: NextResponse }

/**
 * Verifica que el usuario de la sesión pueda administrar la organización:
 * superadmin de plataforma (cualquiera), o admin / superadmin de organización cuyo organization_id coincida.
 * Devuelve un cliente con service role para hacer la escritura.
 */
export async function authorizeOrganizationAdmin(organizationId: string | null | undefined): Promise<AuthResult> {
  if (!organizationId) {
    return { ok: false, response: NextResponse.json({ error: "Missing organizationId" }, { status: 400 }) }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not configured")
    return { ok: false, response: NextResponse.json({ error: "Server configuration error" }, { status: 500 }) }
  }
  const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role, organization_id, status")
    .eq("id", user.id)
    .single()

  // Superadmin de plataforma (sin organization_id) puede editar cualquiera; el superadmin de
  // organización y el admin, solo la suya.
  const isPlatformSuperadmin = profile?.role === "superadmin" && !profile.organization_id
  const isOrgManager =
    (profile?.role === "admin" || profile?.role === "superadmin") &&
    profile.status === "approved" &&
    profile.organization_id === organizationId
  if (!isPlatformSuperadmin && !isOrgManager) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: solo el administrador de la organización puede modificarla" },
        { status: 403 },
      ),
    }
  }

  return { ok: true, serviceClient }
}

/**
 * Valida y normaliza el body de actualización. Ignora campos no permitidos.
 * Devuelve el objeto listo para `update` o un mensaje de error.
 */
export function parseOrganizationUpdate(
  body: Record<string, unknown>,
): { data: Partial<Record<EditableOrganizationField, string | null>> } | { error: string } {
  const data: Partial<Record<EditableOrganizationField, string | null>> = {}

  for (const field of EDITABLE_ORGANIZATION_FIELDS) {
    if (!(field in body)) continue
    const raw = body[field]
    if (raw !== null && typeof raw !== "string") return { error: `${field} debe ser texto` }

    const value = typeof raw === "string" ? raw.trim() : null
    if (value && value.length > MAX_TEXT_LENGTH) return { error: `${field} es demasiado largo` }

    if ((field === "primary_color" || field === "secondary_color") && value && !HEX_COLOR.test(value)) {
      return { error: `${field} debe tener formato #RRGGBB` }
    }
    if ((field === "website" || field === "logo_url") && value && !/^https?:\/\//i.test(value)) {
      return { error: `${field} debe empezar por http:// o https://` }
    }
    if ((field === "name" || field === "nit") && !value) return { error: `${field} es obligatorio` }

    data[field] = value || null
  }

  if (Object.keys(data).length === 0) return { error: "No hay campos para actualizar" }
  return { data }
}
