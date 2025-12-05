import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const SUPABASE_URL = "https://djamkpkuxneexoyvzyez.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqYW1rcGt1eG5lZXhveXZ6eWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NzIwMTAsImV4cCI6MjA4MDI0ODAxMH0.N9ZxBEIPFErtFQ9k79BugQkU8VqcHUd032Xt2X6E4AY"

export async function createServerClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Missing Supabase server env vars")
    throw new Error("Missing Supabase environment variables")
  }

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
        }
      },
    },
  })
}

// Alias for backward compatibility
export const createClient = createServerClient
