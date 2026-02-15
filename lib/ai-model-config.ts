/**
 * Configuración central del modelo de IA (OpenAI).
 * Un solo lugar: variable de entorno OPENAI_MODEL.
 *
 * En .env.local puedes definir:
 *   OPENAI_MODEL=gpt-4o        (recomendado para manejo documental)
 *   OPENAI_MODEL=gpt-4o-mini  (más económico)
 *
 * Opcional: OPENAI_WORKFLOW_MODEL para el agente/workflow (por defecto usa OPENAI_MODEL).
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
