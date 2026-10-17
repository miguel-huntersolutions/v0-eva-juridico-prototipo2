/**
 * Next.js instrumentation hook: se ejecuta una vez al arrancar el servidor.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Solo en runtime Node.js (no en Edge ni en el build del cliente).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/env-validation")
    validateEnv()
  }
}
