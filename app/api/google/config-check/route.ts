import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getGoogleOAuthConfigCheck } from "@/lib/google/oauth"

export const dynamic = "force-dynamic"

/**
 * GET /api/google/config-check
 * Returns masked Google OAuth env status (superadmin only). No secrets exposed.
 */
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const config = getGoogleOAuthConfigCheck()
  const ok =
    config.hasClientId &&
    config.clientIdSuffixOk &&
    config.hasClientSecret &&
    config.clientSecretPrefixOk &&
    config.clientSecretLength >= 20 &&
    config.redirectUriOk

  return NextResponse.json({
    ok,
    ...config,
    hint: ok
      ? "OAuth env looks configured. If invalid_client persists, verify Client ID matches Google Cloud and redeploy."
      : "Fix GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in Vercel Production and redeploy.",
  })
}
