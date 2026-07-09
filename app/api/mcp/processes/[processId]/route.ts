/**
 * GET /api/mcp/processes/[processId]
 * Detalle de un proceso y sus documentos (enlaces Drive).
 * Auth: Bearer EVA_MCP_API_KEY
 */

import { NextRequest, NextResponse } from "next/server"
import { assertMcpApiKey } from "@/lib/mcp/auth"
import { getMcpProcessDetail } from "@/lib/mcp/processes"
import { resolveChannelUser } from "@/lib/mcp/resolve-user"
import { McpProcessDetailQuerySchema } from "@/lib/mcp/types"

export const maxDuration = 30

type RouteContext = { params: Promise<{ processId: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = assertMcpApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { processId } = await context.params
    const params = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = McpProcessDetailQuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 })
    }

    const { channel, externalUserId, phone } = parsed.data
    const resolved = await resolveChannelUser({ channel, externalId: externalUserId, phone })
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error, linked: false }, { status: 403 })
    }

    const process = await getMcpProcessDetail(resolved.user, processId)
    if (!process) {
      return NextResponse.json({ error: "Proceso no encontrado." }, { status: 404 })
    }

    return NextResponse.json({ linked: true, process })
  } catch (err) {
    console.error("[mcp/processes/[processId]]", err)
    const message = err instanceof Error ? err.message : "Error al obtener proceso"
    const status = message.includes("acceso") || message.includes("No tiene") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
