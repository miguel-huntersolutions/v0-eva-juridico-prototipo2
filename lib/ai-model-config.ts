/**
 * Configuración central del modelo de IA (OpenAI) y de los parámetros del asesor jurídico
 * (temperatura y system prompt). Un solo punto para que Vercel/.env.local los sobreescriban.
 *
 * En .env.local / Vercel puedes definir:
 *   OPENAI_MODEL=gpt-4o        (recomendado para manejo documental)
 *   OPENAI_MODEL=gpt-4o-mini  (más económico)
 *
 * Opcional: OPENAI_WORKFLOW_MODEL para el agente/workflow (por defecto usa OPENAI_MODEL).
 * Opcional: ASESOR_JURIDICO_TEMPERATURE (0..2). Default: 0.
 * Opcional: ASESOR_JURIDICO_SYSTEM_PROMPT (texto completo). Default: el del archivo
 *           `lib/ai-chat/asesor-juridico-system-prompt.ts`.
 */

const DEFAULT_MODEL = "gpt-4o"
const DEFAULT_WORKFLOW_MODEL = "gpt-4o-mini"

/** Id del modelo OpenAI (ej. gpt-4o, gpt-4o-mini). Usado en chat, documento, mejorar texto. */
export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL
}

/** Id del modelo para el workflow/agente (RAG, guardrails). Por defecto OPENAI_WORKFLOW_MODEL o OPENAI_MODEL. */
export function getOpenAIWorkflowModel(): string {
  return (
    process.env.OPENAI_WORKFLOW_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    DEFAULT_WORKFLOW_MODEL
  )
}

/** Formato "openai/gpt-4o" para createChatRoute / AI SDK. */
export function getOpenAIChatModelString(): string {
  return `openai/${getOpenAIModel()}`
}

/**
 * Temperatura del asesor jurídico. Lee `ASESOR_JURIDICO_TEMPERATURE` (0..2) y cae al default.
 * Si el valor no es numérico o queda fuera de rango, ignora la variable y usa el default.
 */
export function getAsesorJuridicoTemperature(defaultTemperature = 0): number {
  const raw = process.env.ASESOR_JURIDICO_TEMPERATURE?.trim()
  if (!raw) return defaultTemperature
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 2) return defaultTemperature
  return n
}

/**
 * System prompt del asesor jurídico. Lee `ASESOR_JURIDICO_SYSTEM_PROMPT` y cae al texto
 * por defecto del archivo `lib/ai-chat/asesor-juridico-system-prompt.ts`.
 */
export function getAsesorJuridicoSystemPrompt(defaultPrompt: string): string {
  const raw = process.env.ASESOR_JURIDICO_SYSTEM_PROMPT
  if (typeof raw === "string" && raw.trim().length > 0) return raw
  return defaultPrompt
}
