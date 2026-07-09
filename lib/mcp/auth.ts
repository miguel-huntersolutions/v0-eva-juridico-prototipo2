import { NextRequest } from "next/server"
import { getMcpApiKey } from "./config"

export function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null
  return header.slice(7).trim() || null
}

export function assertMcpApiKey(req: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const expected = getMcpApiKey()
  if (!expected) {
    return { ok: false, status: 503, error: "MCP no configurado (EVA_MCP_API_KEY)" }
  }
  const token = extractBearerToken(req)
  if (!token || token !== expected) {
    return { ok: false, status: 401, error: "API key inválida" }
  }
  return { ok: true }
}
