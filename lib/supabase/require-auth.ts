import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"

/**
 * RF-005 / RF-006 (CAP-01): exige sesión válida en rutas de API.
 * Devuelve `{ user, error }`; si `error` no es null, el handler debe retornarlo.
 */
export async function requireAuth(): Promise<
  { user: User; error: null } | { user: null; error: NextResponse }
> {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Unauthorized", code: "unauthorized" },
        { status: 401 },
      ),
    }
  }

  return { user, error: null }
}
