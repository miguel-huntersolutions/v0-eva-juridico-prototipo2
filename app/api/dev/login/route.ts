import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"
import { homePathForRole } from "@/lib/auth/home-path"

/**
 * POST /api/dev/login  — SOLO DESARROLLO LOCAL
 * Body: { email }
 *
 * Inicia sesión como el usuario indicado sin contraseña, para probar distintos perfiles.
 * Genera un magic link con service role (no envía correo) y lo canjea en el servidor,
 * dejando la cookie de sesión. Responde 404 salvo que se cumplan TODAS las condiciones:
 *   - `next dev` (NODE_ENV=development)
 *   - DEV_LOGIN_ENABLED=true en .env.local (nunca definirla en Vercel)
 *   - la petición llega a localhost / 127.0.0.1
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

function hostnameOf(host: string | null) {
  if (!host) return ""
  return host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0]
}

function isDevLoginEnabled(request: NextRequest) {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_LOGIN_ENABLED === "true" &&
    // Tanto Host como X-Forwarded-Host (si lo hay) deben ser locales.
    [request.headers.get("host"), request.headers.get("x-forwarded-host") ?? "localhost"].every((h) =>
      LOCAL_HOSTS.has(hostnameOf(h)),
    )
  )
}

export async function POST(request: NextRequest) {
  if (!isDevLoginEnabled(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const { email } = (await request.json()) as { email?: unknown }
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 })
    }
    const normalizedEmail = email.trim().toLowerCase()

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Solo usuarios existentes: nunca crear cuentas desde aquí.
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role, status, organization_id")
      .ilike("email", normalizedEmail)
      .maybeSingle()
    if (!profile) {
      return NextResponse.json({ error: "No existe un perfil con ese correo" }, { status: 404 })
    }
    if (profile.status !== "approved") {
      return NextResponse.json({ error: `La cuenta está en estado "${profile.status}"` }, { status: 403 })
    }

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    })
    if (linkError || !link?.properties?.hashed_token) {
      return NextResponse.json({ error: linkError?.message || "No se pudo generar la sesión" }, { status: 500 })
    }

    const supabase = await createServerClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties.hashed_token,
    })
    if (verifyError) {
      return NextResponse.json({ error: verifyError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      role: profile.role,
      redirectTo: homePathForRole(profile.role, profile.organization_id),
    })
  } catch (error) {
    console.error("[dev/login] error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Dev login failed" }, { status: 500 })
  }
}
