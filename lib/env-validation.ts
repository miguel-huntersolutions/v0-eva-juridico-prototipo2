/**
 * RF-001 / CA-001.2 (CAP-01): validar variables de entorno obligatorias al arrancar.
 * Se ejecuta desde `instrumentation.ts` (register) en runtime Node.js.
 *
 * - Faltantes en desarrollo: se registran como advertencia (no se bloquea el dev).
 * - Faltantes en producción: se lanza error y el proceso no arranca.
 */

const REQUIRED_SERVER = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
] as const

const REQUIRED_PRODUCTION_EXTRA = [
  "NEXT_PUBLIC_APP_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
] as const

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production"
  const required = [...REQUIRED_SERVER, ...(isProd ? REQUIRED_PRODUCTION_EXTRA : [])]

  const missing = required.filter((key) => {
    const v = process.env[key]
    return v == null || v.trim() === ""
  })

  if (missing.length === 0) {
    console.log("[env] Variables de entorno obligatorias presentes.")
    return
  }

  const message = `[env] Faltan variables de entorno obligatorias: ${missing.join(", ")}`

  if (isProd) {
    // CA-001.2: negarse a arrancar en producción si falta configuración.
    throw new Error(message)
  }

  console.warn(`${message} (solo advertencia en desarrollo)`)
}
