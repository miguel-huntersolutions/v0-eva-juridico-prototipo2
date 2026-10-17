/**
 * GET /api/mcp/processes
 * Lista procesos accesibles para el usuario vinculado al canal.
 * Auth: Bearer EVA_MCP_API_KEY
 */

import { NextRequest, NextResponse } from "next/server"
import { assertMcpApiKey } from "@/lib/mcp/auth"
import { listMcpProcesses } from "@/lib/mcp/processes"
import { resolveChannelUser } from "@/lib/mcp/resolve-user"
import { McpProcessesQuerySchema } from "@/lib/mcp/types"

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = assertMcpApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = McpProcessesQuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 })
    }

    const { channel, externalUserId, phone, entityId, processCode, limit } = parsed.data
    const resolved = await resolveChannelUser({ channel, externalId: externalUserId, phone })
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error, linked: false }, { status: 403 })
    }

    const processes = await listMcpProcesses(resolved.user, { entityId, processCode, limit })

    return NextResponse.json({
      linked: true,
      count: processes.length,
      processes,
    })
  } catch (err) {
    console.error("[mcp/processes]", err)
    const message = err instanceof Error ? err.message : "Error al listar procesos"
    const status = message.includes("acceso") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
