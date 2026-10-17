import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

/** Service role client for MCP backend operations. */
export function getMcpServiceClient(): SupabaseClient {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurado para MCP")
  }
  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return client
}
