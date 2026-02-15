/**
 * Interpret user intent in document-generation chat using LLM (optional).
 * When OPENAI_API_KEY is set, uses a short completion to return structured intent;
 * improves robustness vs keyword-only detection.
 *
 * Also parses variable assignments from natural language (e.g. "en detalle pon: compra de equipos")
 * so user-set values are applied to state and never overwritten by RAG.
 */

import { getOpenAIModel } from "@/lib/ai-model-config"

export type InterpretedIntent =
  | { intent: "rag_proactive" }
  | { intent: "rag_ondemand"; documentName: string; tag?: string }
  | { intent: "confirm_generate" }
  | { intent: "none" }

/** Result of parsing user message for variable assignments. User values take precedence over RAG. */
export type VariableAssignmentsResult = {
  assignments: Record<string, string>
  /** If user asked to "mejorar con IA" a value, the variable name to improve. */
  improveWithAI?: string
}

const SYSTEM_PROMPT = `Eres un clasificador de intenciones. El usuario está en un chat para generar documentos (plantillas con variables).
Responde ÚNICAMENTE con un JSON válido, sin texto adicional, con esta forma:

1) Buscar datos en general (rellenar variables desde otros documentos/entidad):
   Variaciones: "busque los demás", "busque los datos", "que busque", "dame los datos", "rellena los datos", "busca lo que falte", "completa con la entidad", "trae la información", "que complete", "sí busca", "adelante busca", "ok que busque".
   → {"intent":"rag_proactive"}

2) Buscar en un documento concreto:
   Ej: "busca en Estudios Previos", "busca NIT en Minuta", "en la Minuta el NIT".
   → {"intent":"rag_ondemand","documentName":"nombre del documento","tag":"NIT"} (tag solo si menciona un campo concreto)

3) Confirmar generación (el usuario quiere generar el documento actual):
   Variaciones: "todo ok", "genera", "listo", "adelante", "sí genera", "ok genera", "generar", "sí", "de acuerdo", "perfecto", "listo genera", "dale", "envía", "proceder".
   → {"intent":"confirm_generate"}

4) Cualquier otra cosa (saludos, preguntas, texto que no encaja):
   → {"intent":"none"}

Solo responde el JSON, sin markdown ni explicaciones.`

export async function interpretIntentWithAI(message: string): Promise<InterpretedIntent | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) return null
  try {
    const OpenAI = (await import("openai")).default
    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message.trim() || "hola" },
      ],
      max_tokens: 150,
      temperature: 0,
    })
    const text = completion.choices?.[0]?.message?.content?.trim()
    if (!text) return null
    const parsed = JSON.parse(text) as { intent?: string; documentName?: string; tag?: string }
    if (parsed.intent === "rag_proactive") return { intent: "rag_proactive" }
    if (parsed.intent === "confirm_generate") return { intent: "confirm_generate" }
    if (parsed.intent === "rag_ondemand" && parsed.documentName) {
      return {
        intent: "rag_ondemand",
        documentName: String(parsed.documentName).trim(),
        tag: parsed.tag ? String(parsed.tag).trim() : undefined,
      }
    }
    return { intent: "none" }
  } catch {
    return null
  }
}

const ASSIGNMENTS_SYSTEM = `Eres un extractor de asignaciones de variables para un documento. El usuario escribe en lenguaje natural.
Tienes estas variables (tags) del documento: TAGS_PLACEHOLDER
Reglas:
- Extrae asignaciones como "en DETALLE pon: compra de equipos" -> DETALLE = "compra de equipos". Usa el nombre EXACTO del tag (ej. DETALLE, DIRIGIDO_A).
- Si dice "detalle es X" o "en detalle: X", mapea a la variable que coincida (ej. DETALLE).
- Si pide "mejorar con IA" o "mejorarla con IA" para un valor que acaba de dar, devuelve ese valor en assignments y pon en improveWithAI el nombre exacto del tag.
- Responde ÚNICAMENTE un JSON: {"assignments": {"TAG": "valor texto"}, "improveWithAI": "TAG" o null}
- Si no hay ninguna asignación, responde: {"assignments": {}, "improveWithAI": null}
- No inventes variables que no estén en la lista. Solo texto, sin markdown.`

export async function parseVariableAssignmentsWithAI(
  message: string,
  availableTags: string[],
): Promise<VariableAssignmentsResult | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim() || availableTags.length === 0) return null
  const trimmed = message.trim()
  if (!trimmed) return null
  try {
    const OpenAI = (await import("openai")).default
    const client = new OpenAI({ apiKey })
    const system = ASSIGNMENTS_SYSTEM.replace("TAGS_PLACEHOLDER", availableTags.join(", "))
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: trimmed },
      ],
      max_tokens: 300,
      temperature: 0,
    })
    const text = completion.choices?.[0]?.message?.content?.trim()
    if (!text) return null
    const parsed = JSON.parse(text) as { assignments?: Record<string, string>; improveWithAI?: string | null }
    const assignments: Record<string, string> = {}
    if (parsed.assignments && typeof parsed.assignments === "object") {
      for (const [k, v] of Object.entries(parsed.assignments)) {
        if (availableTags.includes(k) && v != null && String(v).trim() !== "") {
          assignments[k] = String(v).trim()
        }
      }
    }
    const improveWithAI =
      parsed.improveWithAI && availableTags.includes(parsed.improveWithAI) ? parsed.improveWithAI : undefined
    return { assignments, improveWithAI }
  } catch {
    return null
  }
}

/**
 * Context passed to the interpreter so it knows process, entity, secretary, and chat history.
 */
export type ProcessContextForInterpreter = {
  processCode: string
  entityName: string
  secretaryName: string
  processTypeName?: string
  templateName?: string
}

/**
 * AI interprets the user message as a list of actions (no fixed prompts).
 * E.g. "mejora la descripción" -> improve_variable(DETALLE), "muéstrame las variables" -> show_variables.
 */
export type AssistantAction =
  | { action: "set_variable"; tag: string; value: string }
  | { action: "improve_variable"; tag: string }
  | { action: "show_variables" }
  | { action: "set_rag_context"; value: string }
  | { action: "rag_proactive" }
  | { action: "rag_ondemand"; documentName: string; tag?: string }
  | { action: "confirm_generate" }
  | { action: "reply"; message: string }
  | { action: "none" }

const PROCESS_INTERPRETER_SYSTEM = `Eres el asistente de generación de documentos. Interpreta lo que el usuario pide y responde con un JSON array de ACCIONES a ejecutar, en orden.

Contexto del proceso (lo que el usuario ya eligió):
PROCESS_CONTEXT_PLACEHOLDER

Contexto del chat (últimos mensajes):
CHAT_CONTEXT_PLACEHOLDER

Variables (tags) del documento actual: TAGS_PLACEHOLDER
Estado actual de las variables (lo ya indicado por el usuario o recuperado): STATE_PLACEHOLDER

Acciones posibles (usa el nombre EXACTO del tag de la lista):
- {"action":"set_variable","tag":"TAG","value":"texto"} — cuando el usuario da un valor para una variable (ej. "en detalle pon: compra de equipos", "DETALLE es X"). Mapea nombres como "detalle","descripción","dirigido a" al tag correcto (DETALLE, DIRIGIDO_A, etc.).
- {"action":"improve_variable","tag":"TAG"} — cuando pide mejorar/redactar mejor una variable (ej. "mejora la descripción", "mejora el detalle", "redacta mejor DETALLE"). El tag debe existir en la lista.
- {"action":"show_variables"} — cuando pide ver el resultado, las variables, el estado actual (ej. "muéstrame las variables", "qué tenemos", "muestra el resultado", "cómo quedaron").
- {"action":"set_rag_context","value":"texto"} — cuando el usuario indica el contexto para la búsqueda de datos (ej. "municipio Manizales", "es para Villamaría", "Secretaría de Educación", "Alcaldía de Chinchiná"). Extrae solo el texto del contexto, breve.
- {"action":"rag_proactive"} — cuando pide buscar/rellenar datos (ej. "busque los demás", "busca los datos", "completa con la entidad").
- {"action":"rag_ondemand","documentName":"nombre","tag":"TAG"} — cuando pide buscar en un documento concreto (ej. "busca en Minuta", "busca NIT en Estudios Previos").
- {"action":"confirm_generate"} — cuando confirma generar el documento (ej. "genera", "listo", "adelante", "todo ok").
- {"action":"reply","message":"texto"} — cuando solo debes responder con un mensaje (saludos, aclaración). El mensaje en español, breve.
- {"action":"none"} — si no encaja nada de lo anterior.

Responde ÚNICAMENTE un JSON array, sin markdown. Ejemplo: [{"action":"improve_variable","tag":"DETALLE"}]
Puedes devolver varias acciones, ej. [{"action":"set_variable","tag":"DETALLE","value":"compra de equipos"},{"action":"show_variables"}]
Solo usa tags que estén en la lista. Para set_variable e improve_variable el tag es obligatorio.`

export async function interpretProcessWithAI(
  message: string,
  availableTags: string[],
  documentState: Record<string, string>,
  processContext?: ProcessContextForInterpreter | null,
  conversationHistory?: { role: "user" | "assistant"; content: string }[] | null,
): Promise<AssistantAction[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) return null
  const trimmed = message.trim()
  if (!trimmed) return null
  try {
    const OpenAI = (await import("openai")).default
    const client = new OpenAI({ apiKey })
    const processContextStr = processContext
      ? `Proceso: ${processContext.processCode}. Entidad: ${processContext.entityName}. Secretaría: ${processContext.secretaryName}.${processContext.processTypeName ? ` Tipo de proceso: ${processContext.processTypeName}.` : ""}${processContext.templateName ? ` Documento actual: ${processContext.templateName}.` : ""}`
      : "Sin contexto de proceso."
    const chatContextStr =
      conversationHistory && conversationHistory.length > 0
        ? conversationHistory
            .slice(-10)
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")
        : "Sin historial previo."
    const stateStr =
      Object.keys(documentState).length === 0
        ? "ninguna variable con valor aún"
        : Object.entries(documentState)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")
    const system = PROCESS_INTERPRETER_SYSTEM.replace("PROCESS_CONTEXT_PLACEHOLDER", processContextStr)
      .replace("CHAT_CONTEXT_PLACEHOLDER", chatContextStr)
      .replace("TAGS_PLACEHOLDER", availableTags.join(", "))
      .replace("STATE_PLACEHOLDER", stateStr)
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: trimmed },
      ],
      max_tokens: 400,
      temperature: 0,
    })
    const text = completion.choices?.[0]?.message?.content?.trim()
    if (!text) return null
    const parsed = JSON.parse(text) as unknown
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    const actions: AssistantAction[] = []
    for (const item of arr) {
      if (!item || typeof item !== "object" || !("action" in item)) continue
      const a = item as Record<string, unknown>
      const action = String(a.action)
      if (action === "set_variable" && typeof a.tag === "string" && availableTags.includes(a.tag) && a.value != null) {
        actions.push({ action: "set_variable", tag: a.tag, value: String(a.value).trim() })
      } else if (action === "improve_variable" && typeof a.tag === "string" && availableTags.includes(a.tag)) {
        actions.push({ action: "improve_variable", tag: a.tag })
      } else if (action === "show_variables") {
        actions.push({ action: "show_variables" })
      } else if (action === "set_rag_context" && typeof a.value === "string" && String(a.value).trim()) {
        actions.push({ action: "set_rag_context", value: String(a.value).trim() })
      } else if (action === "rag_proactive") {
        actions.push({ action: "rag_proactive" })
      } else if (action === "rag_ondemand" && typeof a.documentName === "string" && a.documentName.trim()) {
        actions.push({
          action: "rag_ondemand",
          documentName: String(a.documentName).trim(),
          tag: typeof a.tag === "string" && a.tag.trim() ? String(a.tag).trim() : undefined,
        })
      } else if (action === "confirm_generate") {
        actions.push({ action: "confirm_generate" })
      } else if (action === "reply" && typeof a.message === "string") {
        actions.push({ action: "reply", message: String(a.message).trim() })
      } else if (action === "none") {
        actions.push({ action: "none" })
      }
    }
    return actions.length > 0 ? actions : null
  } catch {
    return null
  }
}

/** Improve a short text with AI (e.g. "compra de computadoras" -> professional phrasing). */
export async function improveTextWithAI(text: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) return null
  try {
    const OpenAI = (await import("openai")).default
    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        {
          role: "system",
          content:
            "Mejora el siguiente texto para uso en un documento jurídico/administrativo. Responde ÚNICAMENTE el texto mejorado, sin explicaciones ni comillas.",
        },
        { role: "user", content: text },
      ],
      max_tokens: 200,
      temperature: 0.3,
    })
    const out = completion.choices?.[0]?.message?.content?.trim()
    return out || null
  } catch {
    return null
  }
}
