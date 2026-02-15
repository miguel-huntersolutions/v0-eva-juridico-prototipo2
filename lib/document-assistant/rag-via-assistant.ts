/**
 * RAG Phase 2: reuse existing assistant (workflow + file search) to fill tag values.
 * Calls runWorkflow with a strict prompt and parses JSON from the response.
 *
 * Fuentes: hoy solo se buscan los documentos del vector store (file search). Para usar otras fuentes
 * (web, API externa) habría que añadir las herramientas correspondientes en workflow-runner y
 * referenciarlas en el prompt (ej. "si no encuentras en documentos, puedes consultar X").
 */

import { runWorkflow } from "@/lib/ai-chat/workflow-runner"

const RAG_TIMEOUT_MS = 60_000

/** Extract Record<string, string> from assistant reply (JSON only or wrapped in markdown). */
export function parseTagMapFromAssistantResponse(text: string): Record<string, string> {
  if (!text || typeof text !== "string") return {}
  const trimmed = text.trim()
  // Try full string as JSON
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return normalizeTagMap(parsed as Record<string, unknown>)
    }
  } catch {
    // continue
  }
  // Try to extract JSON block (```json ... ``` or ``` ... ```)
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim()
  if (codeBlock) {
    try {
      const parsed = JSON.parse(codeBlock) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return normalizeTagMap(parsed as Record<string, unknown>)
      }
    } catch {
      // continue
    }
  }
  // Try first {...} in the text
  const firstBrace = trimmed.indexOf("{")
  if (firstBrace !== -1) {
    let depth = 0
    let end = -1
    for (let i = firstBrace; i < trimmed.length; i++) {
      if (trimmed[i] === "{") depth++
      if (trimmed[i] === "}") {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    if (end !== -1) {
      try {
        const parsed = JSON.parse(trimmed.slice(firstBrace, end + 1)) as unknown
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return normalizeTagMap(parsed as Record<string, unknown>)
        }
      } catch {
        // continue
      }
    }
  }
  return {}
}

function normalizeTagMap(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k && v != null && typeof v === "string" && v.trim() !== "") {
      out[k.trim()] = v.trim()
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k.trim()] = String(v)
    }
  }
  return out
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("RAG timeout")), ms)
    ),
  ])
}

/**
 * Prompt base para RAG: selecciones del proceso + contexto del usuario.
 * Las etiquetas se interpretan: en el documento puede decir "Alcalde" y la variable es NOMBRE_ALCALDE.
 * IMPORTANTE: los valores deben salir solo de los fragmentos recuperados por file search, nunca del ejemplo.
 */
const RAG_PROACTIVE_PROMPT_BASE = `Debes usar file search para buscar en los documentos y devolver un JSON con los valores encontrados.

Paso 1: Ejecuta la búsqueda en documentos (file search) usando el contexto siguiente para encontrar fragmentos relevantes (listas de municipios, alcaldes, entidades, etc.).
Paso 2: Lee los fragmentos que te devuelva file search. Los valores de tu respuesta deben ser EXACTAMENTE los que aparecen en esos fragmentos.
Paso 3: Devuelve un JSON donde cada clave es una etiqueta de la lista y cada valor es el texto que viste en los documentos. No inventes valores ni copies el ejemplo.

SELECCIONES DEL PROCESO:
- Entidad: "ENTITY_PLACEHOLDER"
- Secretaría: "SECRETARY_PLACEHOLDER"
- Tipo de proceso: "PROCESS_TYPE_PLACEHOLDER"

CONTEXTO DEL USUARIO (úsalo en la búsqueda para filtrar, ej. municipio Manizales):
USER_CONTEXT_PLACEHOLDER

MAPEO: En los documentos los datos pueden tener otra etiqueta (ej. "Alcalde:" en el doc = NOMBRE_ALCALDE en la lista; "Municipio:" = MUNICIPIO; "Entidad:" = ALCALDIA o NOMBRE_ENTIDAD). Interpreta y usa como clave el nombre exacto de la etiqueta de la lista.
- Si el contexto es "municipio de Manizales", busca en los documentos la línea o bloque donde aparezca Manizales y toma de ahí Alcalde, Municipio, Entidad.
- Las CLAVES del JSON = exactamente las etiquetas de la lista. Los VALORES = texto literal extraído de los documentos recuperados.
- Si no aparece un dato en los documentos, no incluyas esa clave. No uses datos de ejemplo.

Etiquetas a rellenar (claves exactas del JSON): TAGS_PLACEHOLDER

Responde ÚNICAMENTE un objeto JSON válido, sin texto antes ni después. Ejemplo de formato (los valores deben venir de tus resultados de file search, no de aquí): {"ALCALDIA":"Alcaldía Municipal de X","MUNICIPIO":"X","NOMBRE_ALCALDE":"nombre completo que aparece en el doc"}`

/**
 * RAG proactivo usando el asistente: busca en los documentos (file search) valores
 * para la entidad/secretaría/tipo de proceso + contexto del usuario. Devuelve mapa tag → valor.
 */
export async function ragProactiveViaAssistant(
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
  if (!process.env.OPENAI_ASSISTANT_WORKFLOW_ID || tags.length === 0) return {}
  const entityName = context.entityName || "la entidad"
  const secretaryName = context.secretaryName || "la secretaría"
  const processTypeName = context.processTypeName || "el tipo de proceso"
  const tagList = tags.join(", ")
  const userContextLine =
    userRagContext && userRagContext.trim()
      ? `"${userRagContext.trim()}" (úsalo para priorizar resultados que coincidan con este contexto: municipio, secretaría concreta, entidad, etc.)`
      : "El usuario no indicó contexto adicional. Basa la búsqueda solo en las selecciones del proceso."

  const prompt = RAG_PROACTIVE_PROMPT_BASE.replace("ENTITY_PLACEHOLDER", entityName)
    .replace("SECRETARY_PLACEHOLDER", secretaryName)
    .replace("PROCESS_TYPE_PLACEHOLDER", processTypeName)
    .replace("USER_CONTEXT_PLACEHOLDER", userContextLine)
    .replace("TAGS_PLACEHOLDER", tagList)

  console.log("[document-assistant] RAG proactive prompt (selecciones + contexto usuario):", {
    entityName,
    secretaryName,
    processTypeName,
    userRagContext: userRagContext || null,
    tags,
  })

  try {
    const response = await withTimeout(
      runWorkflow(prompt, [], { skipGuardrails: true }),
      RAG_TIMEOUT_MS
    )
    const responsePreview = typeof response === "string" ? response.slice(0, 600) : String(response).slice(0, 600)
    console.log("[document-assistant] RAG proactive – respuesta cruda del workflow (primeros 600 chars):", responsePreview)
    const parsed = parseTagMapFromAssistantResponse(response)
    // Solo devolver claves que son etiquetas solicitadas (evitar classification, etc.)
    const result: Record<string, string> = {}
    for (const tag of tags) {
      if (parsed[tag] != null && String(parsed[tag]).trim() !== "") result[tag] = String(parsed[tag]).trim()
    }
    console.log("[document-assistant] RAG proactive – mapa final (solo tags solicitados):", Object.keys(result).length ? result : "(vacío)")
    return result
  } catch (err) {
    console.error("[document-assistant] RAG via assistant (proactive) error:", err)
    return {}
  }
}

/**
 * RAG bajo demanda: busca el valor de un tag (o todos) en un documento concreto.
 * Interpreta: en el doc puede decir "Alcalde" y la etiqueta ser NOMBRE_ALCALDE; mapea por significado.
 */
export async function ragOnDemandViaAssistant(
  documentIdOrName: string,
  tag?: string
): Promise<Record<string, string>> {
  if (!process.env.OPENAI_ASSISTANT_WORKFLOW_ID) return {}
  const tagPart = tag
    ? `el valor que corresponda a "${tag}" (en el documento puede aparecer como "Alcalde", "alcalde", etc.; interpreta y mapea al nombre de variable que corresponda)`
    : "los valores de los campos que encuentres; interpreta etiquetas del documento (ej. Alcalde) al nombre de variable que corresponda"
  const prompt = `Usa la búsqueda en documentos (file search) para encontrar en el documento "${documentIdOrName}" ${tagPart}.

Devuelve un objeto JSON: claves = nombres exactos de variables, valores = texto encontrado. Si en el doc dice "Alcalde: X" y la variable es NOMBRE_ALCALDE, devuelve {"NOMBRE_ALCALDE":"X"}. Solo datos encontrados en los documentos; si no encuentras nada, responde {}.`

  try {
    const response = await withTimeout(
      runWorkflow(prompt, [], { skipGuardrails: true }),
      RAG_TIMEOUT_MS
    )
    return parseTagMapFromAssistantResponse(response)
  } catch (err) {
    console.error("[document-assistant] RAG via assistant (on-demand) error:", err)
    return {}
  }
}
