import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"

/**
 * RF-005 / RF-006 (CAP-01): exige sesión válida y perfil aprobado en rutas de API.
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

  // Igual que el middleware: solo perfiles aprobados.
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle()
  if (profile?.status !== "approved") {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Forbidden: la cuenta no está aprobada", code: "account_not_approved" },
        { status: 403 },
      ),
    }
  }

  return { user, error: null }
}
