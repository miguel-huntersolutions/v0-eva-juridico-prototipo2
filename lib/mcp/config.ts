/** MCP integration config (env). */

export function getMcpApiKey(): string | null {
  return process.env.EVA_MCP_API_KEY?.trim() || null
}

/** Usuario EVA con Google vinculado para subir documentos desde canales externos. */
export function getMcpIntegrationUserId(): string | null {
  return process.env.EVA_MCP_INTEGRATION_USER_ID?.trim() || null
}

export function isMcpConfigured(): boolean {
  return Boolean(getMcpApiKey() && getMcpIntegrationUserId())
}
