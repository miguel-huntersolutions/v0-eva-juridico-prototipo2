import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { getOpenAIModel, temperatureOptionForModel } from "@/lib/ai-model-config"
import { parseTagMapFromAssistantResponse } from "@/lib/document-assistant/rag-via-assistant"
import type { SmartFillContext, TagClassification } from "./types"

function parseClassificationJson(text: string): Partial<TagClassification> | null {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed) as Partial<TagClassification>
  } catch {
    // continue
  }
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim()
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock) as Partial<TagClassification>
    } catch {
      return null
    }
  }
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
        return JSON.parse(trimmed.slice(firstBrace, end + 1)) as Partial<TagClassification>
      } catch {
        return null
      }
    }
  }
  return null
}

function emptyClassification(): TagClassification {
  return { rag: [], generate: [], extract: [], enrich: [], skip: [] }
}

function normalizeClassification(
  raw: Partial<TagClassification>,
  availableTags: string[],
  alreadyFilled: Set<string>,
): TagClassification {
  const result = emptyClassification()
  const assigned = new Set<string>()

  const categories: (keyof TagClassification)[] = ["skip", "rag", "generate", "extract", "enrich"]
  for (const category of categories) {
    const list = raw[category]
    if (!Array.isArray(list)) continue
    for (const tag of list) {
      if (
        typeof tag === "string" &&
        availableTags.includes(tag) &&
        !assigned.has(tag) &&
        !alreadyFilled.has(tag)
      ) {
        result[category].push(tag)
        assigned.add(tag)
      }
    }
  }

  for (const tag of availableTags) {
    if (!assigned.has(tag) && !alreadyFilled.has(tag)) {
      result.generate.push(tag)
    }
  }

  return result
}

/** Classify unfilled tags into RAG, generate, extract, enrich, skip. */
export async function classifyTags(
  tags: string[],
  ctx: SmartFillContext,
  alreadyFilled: Record<string, string>,
): Promise<TagClassification> {
  const unfilled = tags.filter((t) => !alreadyFilled[t]?.trim())
  if (unfilled.length === 0) return emptyClassification()

  const filledSet = new Set(Object.keys(alreadyFilled).filter((k) => alreadyFilled[k]?.trim()))

  const systemPrompt = `Eres un clasificador de etiquetas para plantillas documentales de contratación pública colombiana.
Clasifica CADA etiqueta de la lista en exactamente UNA categoría.

Categorías:
- rag: datos de lookup en documentos indexados (alcaldes, NIT, direcciones, municipios, listados de entidades)
- generate: textos narrativos que la IA debe redactar (justificación, consideraciones, cláusulas descriptivas)
- extract: valores explícitos inferibles del contexto del usuario (montos, fechas, nombres, cifras)
- enrich: textos breves que deben ampliarse con redacción jurídica formal
- skip: no requieren autocompletado adicional (ya tienen valor o son metadatos)

Responde ÚNICAMENTE JSON válido:
{"rag":[],"generate":[],"extract":[],"enrich":[],"skip":[]}`

  const userPrompt = `Etiquetas a clasificar: ${unfilled.join(", ")}

Contexto del proceso:
- Entidad: ${ctx.entityName}
- Secretaría: ${ctx.secretaryName}
- Tipo de proceso: ${ctx.processTypeName}
- Objeto (BD): ${ctx.processObject?.trim() || "(vacío)"}
- Descripción (BD): ${ctx.processDescription?.trim() || "(vacío)"}

Etiquetas ya rellenadas (no incluir): ${[...filledSet].join(", ") || "(ninguna)"}`

  try {
    const modelId = getOpenAIModel()
    const result = await generateText({
      model: openai(modelId),
      system: systemPrompt,
      prompt: userPrompt,
      ...temperatureOptionForModel(modelId, 0),
    })
    const json = parseClassificationJson(result.text)
    if (json) return normalizeClassification(json, unfilled, filledSet)
    return normalizeClassification({ generate: unfilled }, unfilled, filledSet)
  } catch (err) {
    console.error("[smart-fill] classifyTags error:", err)
    return normalizeClassification({ generate: unfilled }, unfilled, filledSet)
  }
}

/** Extract explicit values from user context text. */
export async function extractFromUserContext(
  userContext: string,
  tags: string[],
  ctx: SmartFillContext,
): Promise<Record<string, string>> {
  if (!userContext.trim() || tags.length === 0) return {}

  const systemPrompt = `Extrae valores para etiquetas de plantilla documental desde el contexto del usuario.
Reglas:
- Claves del JSON = nombres EXACTOS de etiquetas de la lista
- Solo incluye valores explícitos o claramente inferibles del texto
- No inventes datos que no estén en el contexto
- No incluyas etiquetas sin valor
Responde ÚNICAMENTE un objeto JSON tag → valor.`

  const userPrompt = `Etiquetas: ${tags.join(", ")}

Contexto del proceso:
- Entidad: ${ctx.entityName}
- Secretaría: ${ctx.secretaryName}
- Tipo: ${ctx.processTypeName}

Contexto del usuario:
${userContext.trim()}`

  try {
    const modelId = getOpenAIModel()
    const result = await generateText({
      model: openai(modelId),
      system: systemPrompt,
      prompt: userPrompt,
      ...temperatureOptionForModel(modelId, 0),
    })
    const parsed = parseTagMapFromAssistantResponse(result.text)
    const out: Record<string, string> = {}
    for (const tag of tags) {
      if (parsed[tag]?.trim()) out[tag] = parsed[tag].trim()
    }
    return out
  } catch (err) {
    console.error("[smart-fill] extractFromUserContext error:", err)
    return {}
  }
}

/** Generate narrative field values with stream-capable generateText (batch). */
export async function generateFieldValues(
  tags: string[],
  userContext: string,
  ctx: SmartFillContext,
  existing: Record<string, string>,
): Promise<Record<string, string>> {
  const toGenerate = tags.filter((t) => !existing[t]?.trim())
  if (toGenerate.length === 0) return {}

  const systemPrompt = `Eres EVA, asistente jurídico de contratación pública colombiana.
Genera valores profesionales para etiquetas de plantilla documental.
- Usa lenguaje jurídico formal y preciso
- Basa el contenido en el contexto del usuario y del proceso
- No inventes montos o fechas no mencionados
- Responde ÚNICAMENTE JSON: clave = etiqueta exacta, valor = texto del campo`

  const filledSummary = Object.entries(existing)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v.slice(0, 120)}${v.length > 120 ? "…" : ""}`)
    .join("\n")

  const userPrompt = `Genera valores para: ${toGenerate.join(", ")}

Proceso:
- Entidad: ${ctx.entityName}
- Secretaría: ${ctx.secretaryName}
- Tipo: ${ctx.processTypeName}
- Objeto (BD): ${ctx.processObject?.trim() || "(vacío)"}
- Descripción (BD): ${ctx.processDescription?.trim() || "(vacío)"}

Contexto del usuario:
${userContext.trim()}

${filledSummary ? `Valores ya definidos:\n${filledSummary}` : ""}`

  try {
    const modelId = getOpenAIModel()
    const result = await generateText({
      model: openai(modelId),
      system: systemPrompt,
      prompt: userPrompt,
      ...temperatureOptionForModel(modelId, 0.3),
    })
    const parsed = parseTagMapFromAssistantResponse(result.text)
    const out: Record<string, string> = {}
    for (const tag of toGenerate) {
      if (parsed[tag]?.trim()) out[tag] = parsed[tag].trim()
    }
    return out
  } catch (err) {
    console.error("[smart-fill] generateFieldValues error:", err)
    return {}
  }
}

/** Enrich short values with improveText logic (batch, sequential to avoid rate limits). */
export async function enrichFieldValues(
  tags: string[],
  formData: Record<string, string>,
  ctx: SmartFillContext,
): Promise<Record<string, string>> {
  const { improveText } = await import("@/lib/ai-chat/improve-text")
  const out: Record<string, string> = {}

  for (const tag of tags) {
    const current = formData[tag]?.trim()
    if (!current) continue
    try {
      const improved = await improveText({
        text: current,
        fieldName: tag.toLowerCase(),
        fieldLabel: tag.replace(/_/g, " "),
        entityName: ctx.entityName,
        secretaryName: ctx.secretaryName,
        processTypeName: ctx.processTypeName,
      })
      if (improved?.trim()) out[tag] = improved.trim()
    } catch (err) {
      console.error(`[smart-fill] enrich ${tag} error:`, err)
    }
  }

  return out
}
