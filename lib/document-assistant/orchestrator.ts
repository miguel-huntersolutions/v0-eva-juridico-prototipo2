/**
 * Document assistant orchestrator (SPEC-002).
 * Builds initial message, detects intent, and prepares generation payload.
 * RAG: reuses existing assistant (workflow + file search) when configured; otherwise stub.
 */

import {
  ragProactiveViaAssistant,
  ragOnDemandViaAssistant,
} from "./rag-via-assistant"

const USE_ASSISTANT_RAG = !!process.env.OPENAI_ASSISTANT_WORKFLOW_ID

/** RAG proactivo: usa el asistente (file search) si está configurado; si no, devuelve {}. */
export async function ragProactive(
  context: {
    entityId: string
    entityName?: string
    secretaryId?: string
    secretaryName?: string
    processTypeId?: string
    processTypeName?: string
  },
  tags: string[],
  userRagContext?: string | null
): Promise<Record<string, string>> {
  if (!USE_ASSISTANT_RAG) {
    console.log("[document-assistant] RAG skipped: OPENAI_ASSISTANT_WORKFLOW_ID no está configurado")
    return {}
  }
  return ragProactiveViaAssistant(context, tags, userRagContext)
}

/** RAG bajo demanda: usa el asistente si está configurado; si no, devuelve {}. */
export async function ragOnDemand(documentIdOrName: string, tag?: string): Promise<Record<string, string>> {
  if (USE_ASSISTANT_RAG) return ragOnDemandViaAssistant(documentIdOrName, tag)
  return {}
}

/** Detect simple intents from user message (Phase 1: keyword-based). */
export function detectIntent(message: string): "rag_proactive" | "rag_ondemand" | "confirm_generate" | "none" {
  const lower = message.trim().toLowerCase()
  if (/busque\s*(los\s*)?demás|buscar\s*(los\s*)?demás|busque\s*los\s*datos/i.test(lower)) return "rag_proactive"
  if (/busca\s+(en\s+)?(el\s+)?documento|buscar\s+en\s+(el\s+)?documento|busca\s+en\s+doc|busca\s+.+\s+en\s+/i.test(lower)) return "rag_ondemand"
  if (/todo\s+ok|listo|genera|generar|confirmo|confirmar|adelante|sí\s*,\s*genera/i.test(lower)) return "confirm_generate"
  return "none"
}

/**
 * Parse "busca [tag] en [doc]" or "busca en [doc]". Returns { documentName, tag? }.
 */
export function parseOnDemandQuery(message: string): { documentName: string; tag?: string } | null {
  const trimmed = message.trim()
  // "busca NOMBRE_ENTIDAD en Estudios Previos" or "busca en Estudios Previos"
  const withTag = trimmed.match(/\bbusca\s+([A-Z0-9_]+)\s+en\s+(.+)/i)
  if (withTag) return { documentName: withTag[2].trim(), tag: withTag[1].trim() }
  const onlyDoc = trimmed.match(/\bbusca\s+en\s+(?:el\s+documento\s+)?["']?([^"']+)["']?/i)
  if (onlyDoc) return { documentName: onlyDoc[1].trim() }
  const alt = trimmed.match(/\bbuscar\s+en\s+(?:el\s+documento\s+)?["']?([^"']+)["']?/i)
  if (alt) return { documentName: alt[1].trim() }
  return null
}

/** Clave reservada en documentState para el contexto de búsqueda RAG indicado por el usuario. No se envía a generate-document. */
export const USER_RAG_CONTEXT_KEY = "__userRagContext"

/** Build the first assistant message for the current document (Paso 1 + Paso 2). Pide contexto para la búsqueda RAG. */
export function buildInitialMessage(
  templateName: string,
  tags: string[],
  documentIndex: number,
  totalDocuments: number
): string {
  const docLabel = totalDocuments > 1 ? `Documento ${documentIndex + 1} de ${totalDocuments}` : "documento"
  const tagList = tags.length ? tags.join(", ") : "ninguna variable"
  return `Vamos a generar el ${docLabel}: **${templateName}**. Variables a completar: ${tagList}.

Para que la búsqueda de datos sea más acertada, indique el contexto (ej. municipio Manizales, Secretaría de Educación, o entidad concreta). Si no lo necesita, escriba **sigo**.

Luego puede indicar valores (ej: «en DETALLE pon: compra de equipos»), pedir **busque los demás** o **genera** cuando esté listo.`
}

/** Build response after "busque los demás" with stub RAG (nothing found). */
export function buildRagProactiveFallbackMessage(): string {
  return "No encontré datos adicionales en los documentos de la entidad. Puede indicarme los valores, pedir que busque en un documento concreto, o decir **genera con IA** para que complete con inteligencia artificial."
}

/** Build response for "confirm_generate" when we will trigger generation. */
export function buildConfirmGenerateMessage(documentName: string): string {
  return `Generando **${documentName}**…`
}

/** Merge RAG result into documentState (no overwrite existing non-empty). */
export function mergeRagIntoState(
  documentState: Record<string, string>,
  ragResult: Record<string, string>
): Record<string, string> {
  const next = { ...documentState }
  for (const [tag, value] of Object.entries(ragResult)) {
    if (value != null && String(value).trim() !== "" && (!next[tag] || next[tag].trim() === "")) {
      next[tag] = String(value).trim()
    }
  }
  return next
}

/** Build a short context block to print in the chat: proceso, entidad, secretaría, tipo, contexto RAG y variables actuales. */
export function buildChatContextBlock(
  context: { processCode: string; entityName: string; secretaryName: string; processTypeName?: string },
  documentState: Record<string, string>,
): string {
  const parts = [`Proceso ${context.processCode}`, context.entityName, context.secretaryName]
  if (context.processTypeName) parts.push(context.processTypeName)
  const line = parts.join(" · ")
  const userRag = documentState[USER_RAG_CONTEXT_KEY]
  const vars = Object.entries(documentState).filter(
    ([k, v]) => k !== USER_RAG_CONTEXT_KEY && v != null && String(v).trim() !== "",
  )
  let extra = ""
  if (userRag && String(userRag).trim()) extra = `\n**Contexto de búsqueda:** ${userRag}`
  if (vars.length > 0) extra += `\n**Variables actuales:** ${vars.map(([k, v]) => `${k}=${v}`).join(" · ")}`
  return `*(${line})*${extra}\n\n`
}
