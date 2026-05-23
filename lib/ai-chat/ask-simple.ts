/**
 * Simple question for a form field – NO legal/process context.
 * Use for: "convierte 989898 a letras", "formatea esta fecha", "resume en una línea", etc.
 */

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { getOpenAIModel, getOpenAIChatModelString, temperatureOptionForModel } from "@/lib/ai-model-config"

export interface AskSimpleOptions {
  /** User question / instruction – ONLY this is used as input (e.g. "convierte 5000 a letras") */
  question: string
  /** Field label for clarity only (optional) */
  fieldLabel?: string
  /** AI model override */
  model?: string
}

const SYSTEM_PROMPT = `Eres un asistente útil. El usuario está completando un campo y te pide una transformación, análisis o respuesta.

Reglas (en orden de prioridad):
1. NUNCA repitas o devuelvas como respuesta el mismo texto largo que el usuario pegó. Si el usuario pide "analiza este texto", "qué código SECOP/UNSPSC", "busca el que mejor se acerque", "clasifica", etc., debes ANALIZAR y dar tu RESULTADO (código(s), recomendación, resumen), no devolver el texto de entrada.
2. Cuando pidan un código (SECOP, UNSPSC, etc.) o clasificación a partir de una descripción: responde con el código o códigos más adecuados y una breve justificación (ej. "10191500 (Industrias cafeteras)" o "80161500 - Servicios de desarrollo agrícola. El convenio es para fortalecimiento cafetero y renovación de cafetales."). El texto que debe ir en el campo puede ser el código con nombre, o el código principal si el campo es solo para código.
3. Responde con el texto que debe quedar en el campo: sin encabezados tipo "El resultado es:", sin comillas envolventes. Para preguntas de análisis/código puedes incluir 1-2 líneas de justificación si ayuda.
4. Si en la pregunta aparece un número (5000, 1.234.567, etc.), úsalo: convierte a letras si pide "a letras", "en pesos colombianos", etc. (ej. 5000 → cinco mil pesos colombianos).
5. Si pide formato, mayúsculas, resumir, traducir: haz solo eso sobre el dato que dé en la pregunta.
6. Tu única entrada es la pregunta o instrucción del usuario. Responde usando únicamente lo que escribió en esa pregunta.`

export async function askSimple(options: AskSimpleOptions): Promise<string> {
  const { question, fieldLabel, model = getOpenAIChatModelString() } = options

  if (!question?.trim()) {
    throw new Error("question is required")
  }

  // Solo se usa lo que el usuario escribe en "Pregunta o instrucción"; no se envía contenido de otro campo.
  let userPrompt = question.trim()
  if (fieldLabel) {
    userPrompt = `[Campo: ${fieldLabel}]\n\n${userPrompt}`
  }
  userPrompt += `\n\nResponde con el texto que debe ir en el campo (si pides análisis o código, da el resultado y opcionalmente una breve justificación). No repitas el texto largo de entrada como respuesta.`

  const modelId = model?.startsWith("openai/") ? model.replace("openai/", "") : getOpenAIModel()
  const openaiModel = model?.startsWith("openai/")
    ? openai(modelId as "gpt-4o")
    : openai(modelId as "gpt-4o")

  const result = await generateText({
    model: openaiModel,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    ...temperatureOptionForModel(modelId, 0.3),
    maxTokens: 1000,
  })

  return result.text.trim()
}
