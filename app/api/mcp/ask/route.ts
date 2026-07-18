/**
 * POST /api/mcp/ask
 * Asistente jurídico (RAG + asesor normativo) para canales externos.
 * Auth: Bearer EVA_MCP_API_KEY
 */

import { NextRequest, NextResponse } from "next/server"
import { assertMcpApiKey } from "@/lib/mcp/auth"
import { mcpAsk } from "@/lib/mcp/ask"
import { resolveChannelUser } from "@/lib/mcp/resolve-user"
import { McpAskSchema } from "@/lib/mcp/types"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = assertMcpApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 503 })
  }

  try {
    const body = await req.json()
    const parsed = McpAskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 })
    }

    const { channel, externalUserId, phone } = parsed.data
    const resolved = await resolveChannelUser({
      channel,
      externalId: externalUserId,
      phone,
    })
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error, linked: false }, { status: 403 })
    }

    const result = await mcpAsk(resolved.user, parsed.data)

    return NextResponse.json({
      linked: true,
      message: result.message,
      answerSource: result.answerSource,
    })
  } catch (err) {
    console.error("[mcp/ask]", err)
    const message = err instanceof Error ? err.message : "Error en el asistente"
    const status =
      message.includes("acceso") || message.includes("No tiene") || message.includes("encontrado")
        ? 403
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
