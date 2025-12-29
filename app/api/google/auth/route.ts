import { NextRequest, NextResponse } from "next/server"
import { getAuthUrl } from "@/lib/google/oauth"
import { createServerClient } from "@/lib/supabase/server"

/**
 * GET /api/google/auth
 * Initiates the OAuth2 flow by redirecting to Google's authorization page
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const authUrl = getAuthUrl()
    
    // Store the user ID in the state parameter for security
    // In a production app, you might want to use a session or encrypted state
    const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64")
    const urlWithState = `${authUrl}&state=${encodeURIComponent(state)}`

    return NextResponse.json({ authUrl: urlWithState })
  } catch (error) {
    console.error("Error initiating OAuth2 flow:", error)
    return NextResponse.json(
      { error: "Failed to initiate OAuth2 flow", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

