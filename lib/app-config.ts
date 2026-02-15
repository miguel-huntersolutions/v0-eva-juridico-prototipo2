/**
 * Configuración de aplicación desde variables de entorno.
 * Valores que pueden cambiar por entorno (dev/staging/prod) sin tocar código.
 *
 * Ver docs/env-config.md (o .env.example) para la lista completa de variables.
 */

/** URL base de la app (invitaciones, callbacks, links en emails). Debe coincidir con el dominio. */
export function getAppUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  )
}

/** Timeout en ms para descargas de Google Drive (documentos/plantillas). Default 2 min. */
export function getDriveRequestTimeoutMs(): number {
  const v = process.env.GOOGLE_DRIVE_TIMEOUT_MS
  if (v != null && v !== "") {
    const n = parseInt(v, 10)
    if (!Number.isNaN(n) && n > 0) return n
  }
  return 120_000
}

/** Duración máxima en segundos para la ruta de chat del asistente. */
export function getChatMaxDuration(): number {
  const v = process.env.AI_CHAT_MAX_DURATION
  if (v != null && v !== "") {
    const n = parseInt(v, 10)
    if (!Number.isNaN(n) && n > 0) return n
  }
  return 60
}

/** Duración máxima en segundos para la ruta del asistente (workflow). */
export function getAssistantMaxDuration(): number {
  const v = process.env.ASSISTANT_MAX_DURATION
  if (v != null && v !== "") {
    const n = parseInt(v, 10)
    if (!Number.isNaN(n) && n > 0) return n
  }
  return 60
}

/** Duración máxima en segundos para generar documento (subida a Drive, etc.). */
export function getGenerateDocumentMaxDuration(): number {
  const v = process.env.GENERATE_DOCUMENT_MAX_DURATION
  if (v != null && v !== "") {
    const n = parseInt(v, 10)
    if (!Number.isNaN(n) && n > 0) return n
  }
  return 120
}
