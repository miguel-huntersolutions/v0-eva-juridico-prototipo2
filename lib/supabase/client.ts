import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function createBrowserClient() {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://djamkpkuxneexoyvzyez.supabase.co"
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqYW1rcGt1eG5lZXhveXZ6eWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NzIwMTAsImV4cCI6MjA4MDI0ODAxMH0.N9ZxBEIPFErtFQ9k79BugQkU8VqcHUd032Xt2X6E4AY"

  client = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey)

  return client
}

// Alias for backward compatibility
export const createClient = createBrowserClient
