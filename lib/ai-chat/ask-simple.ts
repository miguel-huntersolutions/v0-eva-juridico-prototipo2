/**
 * Simple question for a form field – NO legal/process context.
 * Use for: "convierte 989898 a letras", "formatea esta fecha", "resume en una línea", etc.
 */

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { getOpenAIModel, getOpenAIChatModelString } from "@/lib/ai-model-config"

export interface AskSimpleOptions {
  /** Current content of the field (optional) */
  text?: string
  /** User question / instruction (e.g. "convierte este número a letras") */
  question: string
  /** Field label for clarity only */
  fieldLabel?: string
  /** AI model override */
  model?: string
}

const SYSTEM_PROMPT = `Eres un asistente útil. El usuario está completando un campo y te pide una transformación o respuesta.

Reglas (en orden de prioridad):
1. Responde ÚNICAMENTE con el texto que debe quedar en el campo. Sin explicaciones, sin "El resultado es:", sin comillas.
2. Si en la pregunta del usuario aparece un número (cifras, ej. 5000, 1.234.567), SIEMPRE úsalo. Convierte ese número a letras si pide "a letras", "en letras", "en pesos", "en pesos colombianos", etc. Ejemplo: "convierte 5000 a letras en pesos colombianos" → "CINCO MIL PESOS M/CTE" o "cinco mil pesos colombianos" según el formato habitual. Nunca respondas "Escribe el número en el campo" si el número ya está en la pregunta.
3. Si la pregunta incluye cualquier dato (número, palabra, fecha), usa ese dato y devuelve el resultado. No pidas que lo escriba en el campo.
4. Para "número a letras" en español/Colombia: escribe en letras (ej. 5000 → cinco mil). Si pide "pesos colombianos", puedes añadir "pesos" o "pesos M/CTE" según contexto.
5. Solo si la pregunta dice explícitamente "este texto", "el contenido del campo", "esto" (sin dar el valor) Y el campo está vacío, entonces di brevemente que indique el valor. En cualquier otro caso, usa lo que venga en la pregunta.`

export async function askSimple(options: AskSimpleOptions): Promise<string> {
  const { text, question, fieldLabel, model = getOpenAIChatModelString() } = options

  if (!question?.trim()) {
    throw new Error("question is required")
  }

  let userPrompt = `Pregunta del usuario: ${question.trim()}\n\n`
  if (fieldLabel) {
    userPrompt += `(Campo: ${fieldLabel})\n\n`
  }
  if (text != null && String(text).trim() !== "") {
    userPrompt += `Contenido actual del campo:\n${String(text).trim()}\n\n`
  } else {
    userPrompt += `Contenido actual del campo: (vacío)\n\n`
  }
  userPrompt += `Responde solo con el texto que debe ir en el campo, sin explicaciones.`

  const openaiModel = model?.startsWith("openai/")
    ? openai(model.replace("openai/", "") as "gpt-4o")
    : openai(getOpenAIModel() as "gpt-4o")

  const result = await generateText({
    model: openaiModel,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.3,
    maxTokens: 1000,
  })

  return result.text.trim()
}
