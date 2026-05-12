import { createChatRoute } from "@/lib/ai-chat/create-chat-api-route"
import { getChatMaxDuration } from "@/lib/app-config"
import {
  getOpenAIChatModelString,
  getAsesorJuridicoSystemPrompt,
  getAsesorJuridicoTemperature,
} from "@/lib/ai-model-config"
import {
  ASESOR_JURIDICO_CHAT_WEB_MODE_PREFIX,
  ASESOR_JURIDICO_SYSTEM_PROMPT_DEFAULT,
  ASESOR_JURIDICO_TEMPERATURE_DEFAULT,
} from "@/lib/ai-chat/asesor-juridico-system-prompt"

/** Segment config must be static; runtime duration can be set via AI_CHAT_MAX_DURATION / Vercel. */
export const maxDuration = 60

const SYSTEM_PROMPT = `${ASESOR_JURIDICO_CHAT_WEB_MODE_PREFIX}${getAsesorJuridicoSystemPrompt(ASESOR_JURIDICO_SYSTEM_PROMPT_DEFAULT)}

**Formato de respuesta (Markdown)**:
- ## para títulos principales, ### para subtítulos, **negrita** para términos clave
- Listas numeradas o con viñetas cuando ayuden a la lectura
- Al cierre, cuando aplique: **Fuentes consultadas:** (normas citadas) y recordatorio breve de la advertencia ética si el caso lo requiere.`

export const POST = createChatRoute({
  systemPrompt: SYSTEM_PROMPT,
  model: getOpenAIChatModelString(),
  temperature: getAsesorJuridicoTemperature(ASESOR_JURIDICO_TEMPERATURE_DEFAULT),
  maxDuration: getChatMaxDuration(),
})
