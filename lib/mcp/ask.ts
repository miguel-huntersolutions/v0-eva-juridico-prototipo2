import { runRagFirstThenGeneralChat } from "@/lib/ai-chat/workflow-runner"
import type { ChatMessage } from "@/lib/ai-chat/types"
import { assertEntityAccess } from "./entity-access"
import { assertProcessAccess } from "./processes"
import { getMcpServiceClient } from "./service-client"
import type { ResolvedMcpUser } from "./resolve-user"
import type { McpAskRequest } from "./types"

export type McpAskResult = {
  message: string
  answerSource: "documents" | "general"
}

async function buildContextPrefix(
  user: ResolvedMcpUser,
  body: McpAskRequest,
): Promise<string | null> {
  const parts: string[] = []
  const supabase = getMcpServiceClient()

  if (body.entityId) {
    const access = await assertEntityAccess(user, body.entityId)
    if (!access.ok) throw new Error(access.error)
    const { data: entity } = await supabase
      .from("entities")
      .select("id, name")
      .eq("id", body.entityId)
      .maybeSingle()
    if (entity?.name) parts.push(`Entidad: ${entity.name}`)
  }

  if (body.processId) {
    const access = await assertProcessAccess(user, body.processId)
    if (!access.ok) throw new Error(access.error)
    const { data: process } = await supabase
      .from("processes")
      .select("code, object, status")
      .eq("id", body.processId)
      .maybeSingle()
    if (process) {
      parts.push(`Proceso: ${process.code}`)
      if (process.object) parts.push(`Objeto: ${process.object}`)
      if (process.status) parts.push(`Estado: ${process.status}`)
    }
  }

  if (parts.length === 0) return null
  return `[Contexto EVA]\n${parts.join("\n")}\n[/Contexto EVA]`
}

/**
 * Asistente jurídico para canales: mismo motor que /api/assistant (RAG + asesor).
 */
export async function mcpAsk(
  user: ResolvedMcpUser,
  body: McpAskRequest,
): Promise<McpAskResult> {
  const contextPrefix = await buildContextPrefix(user, body)
  const inputText = contextPrefix
    ? `${contextPrefix}\n\nPregunta del usuario:\n${body.message}`
    : body.message

  const history: ChatMessage[] = (body.history || []).map((m, i) => ({
    id: `mcp-hist-${i}`,
    role: m.role,
    content: m.content,
    timestamp: new Date().toISOString(),
  }))

  const { text, source } = await runRagFirstThenGeneralChat(inputText, history)

  return {
    message: text,
    answerSource: source,
  }
}
