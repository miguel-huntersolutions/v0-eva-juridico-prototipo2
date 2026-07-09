/**
 * POST /api/mcp/generate-smart
 * Generación automática one-shot para canales externos (Telegram, WhatsApp vía OpenClaw).
 * Auth: Bearer EVA_MCP_API_KEY
 */

import { NextRequest, NextResponse } from "next/server"
import { assertMcpApiKey } from "@/lib/mcp/auth"
import { isMcpConfigured } from "@/lib/mcp/config"
import { mcpAutoGenerateSmart } from "@/lib/mcp/orchestrate"
import { McpGenerateSmartSchema } from "@/lib/mcp/types"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = assertMcpApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!isMcpConfigured()) {
    return NextResponse.json(
      { error: "MCP incompleto: configure EVA_MCP_API_KEY y EVA_MCP_INTEGRATION_USER_ID" },
      { status: 503 },
    )
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 503 })
  }

  try {
    const body = await req.json()
    const parsed = McpGenerateSmartSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 })
    }

    const result = await mcpAutoGenerateSmart(parsed.data)
    const httpStatus = result.status === "blocked" ? 422 : 200
    return NextResponse.json(result, { status: httpStatus })
  } catch (err) {
    console.error("[mcp/generate-smart]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error en generación" },
      { status: 500 },
    )
  }
}
