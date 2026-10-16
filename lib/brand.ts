/**
 * Nombre y textos de marca de la aplicación.
 *
 * Los valores por defecto viven en `lang/es.json`. Para cambiar el nombre basta con
 * editar ese archivo, o definir `NEXT_PUBLIC_APP_NAME` (p. ej. por entorno en Vercel)
 * sin tocar el código.
 */
import es from "@/lang/es.json"

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || es.app.name
export const APP_TAGLINE = es.app.tagline
export const APP_TITLE = `${APP_NAME} - ${es.app.title}`
export const APP_DESCRIPTION = es.app.description
export const ASSISTANT_NAME = process.env.NEXT_PUBLIC_ASSISTANT_NAME || es.app.assistantName
