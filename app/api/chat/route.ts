import { createChatRoute } from "@/lib/ai-chat/create-chat-api-route"
import { requireAuth } from "@/lib/supabase/require-auth"
import { createServerClient } from "@/lib/supabase/server"
import { logAuditEvent, getRequestIp } from "@/lib/audit/log"
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
import { buildGuaranteeLawEvaContext } from "@/lib/guarantee-law/eva-context"

/** Segment config must be static; runtime duration can be set via AI_CHAT_MAX_DURATION / Vercel. */
export const maxDuration = 60

const BASE_SYSTEM_PROMPT = `${ASESOR_JURIDICO_CHAT_WEB_MODE_PREFIX}${getAsesorJuridicoSystemPrompt(ASESOR_JURIDICO_SYSTEM_PROMPT_DEFAULT)}

**Formato de respuesta (Markdown)**:
- ## para títulos principales, ### para subtítulos, **negrita** para términos clave
- Listas numeradas o con viñetas cuando ayuden a la lectura
- Al cierre, cuando aplique: **Fuentes consultadas:** (normas citadas) y recordatorio breve de la advertencia ética si el caso lo requiere.`

/** CA-046.2: periodos de EVA + etapas si el usuario cita un código de proceso. */
async function buildSystemPrompt(userHint: string, organizationId?: string | null): Promise<string> {
  try {
    const extra = await buildGuaranteeLawEvaContext(userHint, organizationId)
    return extra ? `${BASE_SYSTEM_PROMPT}${extra}` : BASE_SYSTEM_PROMPT
  } catch {
    return BASE_SYSTEM_PROMPT
  }
}

// RF-005 (CAP-01): exigir sesión antes de consumir el modelo.
export async function POST(req: Request) {
  const { user, error } = await requireAuth()
  if (error) return error

  // CAP-09 (RF-031): auditar la consulta a EVA SIN guardar su contenido
  // (solo metadatos: cantidad de mensajes y longitud total en caracteres).
  try {
    const cloned = req.clone()
    const body = await cloned.json().catch(() => null)
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const totalChars = messages.reduce(
      (acc: number, m: any) => acc + (typeof m?.content === "string" ? m.content.length : 0),
      0,
    )
    await logAuditEvent({
      action: "eva_query",
      actorId: user?.id ?? null,
      details: { messageCount: messages.length, totalChars },
      ip: getRequestIp(req),
    })
  } catch {
    // La auditoría nunca bloquea el chat
  }

  // System prompt dinámico: incluye los periodos de ley de garantías (CA-046.2)
  let userHint = ""
  try {
    const clonedHint = req.clone()
    const hintBody = await clonedHint.json().catch(() => null)
    const msgs = Array.isArray(hintBody?.messages) ? hintBody.messages : []
    const lastUser = [...msgs].reverse().find((m: { role?: string; content?: string }) => m?.role === "user")
    userHint = typeof lastUser?.content === "string" ? lastUser.content : ""
  } catch {
    userHint = ""
  }

  let organizationId: string | null = null
  try {
    if (user?.id) {
      const supabase = await createServerClient()
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle()
      organizationId = profile?.organization_id ?? null
    }
  } catch {
    organizationId = null
  }

  const systemPrompt = await buildSystemPrompt(userHint, organizationId)
  const handler = createChatRoute({
    systemPrompt,
    model: getOpenAIChatModelString(),
    temperature: getAsesorJuridicoTemperature(ASESOR_JURIDICO_TEMPERATURE_DEFAULT),
    maxDuration: getChatMaxDuration(),
  })
  return handler(req)
}
