import { NextResponse } from "next/server"
import { createChatRoute } from "@/lib/ai-chat/create-chat-api-route"
import { requireAuth } from "@/lib/supabase/require-auth"
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

/** Segment config must be static; runtime duration can be set via AI_CHAT_MAX_DURATION / Vercel. */
export const maxDuration = 60

const BASE_SYSTEM_PROMPT = `${ASESOR_JURIDICO_CHAT_WEB_MODE_PREFIX}${getAsesorJuridicoSystemPrompt(ASESOR_JURIDICO_SYSTEM_PROMPT_DEFAULT)}

**Formato de respuesta (Markdown)**:
- ## para títulos principales, ### para subtítulos, **negrita** para términos clave
- Listas numeradas o con viñetas cuando ayuden a la lectura
- Al cierre, cuando aplique: **Fuentes consultadas:** (normas citadas) y recordatorio breve de la advertencia ética si el caso lo requiere.`

/**
 * CA-046.2: si hay periodos de ley de garantías activos (o próximos a iniciar),
 * EVA los conoce y los advierte cuando una fecha del proceso cae dentro.
 */
async function buildSystemPrompt(): Promise<string> {
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return BASE_SYSTEM_PROMPT
    const { createClient } = await import("@supabase/supabase-js")
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const today = new Date().toISOString().split("T")[0]
    const { data: periods } = await service
      .from("guarantee_law_periods")
      .select("name, starts_on, ends_on, scope")
      .gte("ends_on", today)
      .order("starts_on", { ascending: true })
      .limit(5)
    if (!periods || periods.length === 0) return BASE_SYSTEM_PROMPT

    const list = periods
      .map((p) => `- "${p.name}": ${p.starts_on} a ${p.ends_on}${p.scope ? ` (${p.scope})` : ""}`)
      .join("\n")
    return `${BASE_SYSTEM_PROMPT}

**Ley de garantías (periodos de restricción vigentes o próximos)**:
${list}
Cuando una fecha de etapa de un proceso caiga dentro de uno de estos periodos, adviértelo expresamente en tu respuesta indicando el nombre del periodo y sus fechas.`
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
  const systemPrompt = await buildSystemPrompt()
  const handler = createChatRoute({
    systemPrompt,
    model: getOpenAIChatModelString(),
    temperature: getAsesorJuridicoTemperature(ASESOR_JURIDICO_TEMPERATURE_DEFAULT),
    maxDuration: getChatMaxDuration(),
  })
  return handler(req)
}
