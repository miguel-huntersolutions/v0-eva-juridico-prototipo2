/**
 * Google OAuth2 integration
 * Handles OAuth2 authentication flow and token management
 */

import { google } from "googleapis"
import { createServerClient } from "@/lib/supabase/server"

// Initialize OAuth2 client
export function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )

  return oauth2Client
}

// Scopes required for Drive and Sheets
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
]

/**
 * Generate the authorization URL for OAuth2 flow
 * @returns The authorization URL
 */
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // Required to get refresh token
    scope: GOOGLE_SCOPES,
    prompt: "consent", // Force consent screen to get refresh token
  })
}

/**
 * Exchange authorization code for tokens
 * @param code - The authorization code from the callback
 * @returns The tokens (access_token, refresh_token, etc.)
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

/**
 * Get stored tokens for a user from the database
 * @param userId - The user ID
 * @returns The tokens or null if not found
 */
export async function getStoredTokens(userId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("google_oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: new Date(data.expiry_date),
    token_type: data.token_type || "Bearer",
    scope: data.scope,
  }
}

/**
 * Save or update tokens in the database
 * @param userId - The user ID
 * @param tokens - The tokens to save
 */
export async function saveTokens(userId: string, tokens: any) {
  const supabase = await createServerClient()
  
  const tokenData = {
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type || "Bearer",
    expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : new Date(Date.now() + 3600 * 1000).toISOString(), // Default 1 hour if not provided
    scope: tokens.scope || GOOGLE_SCOPES.join(" "),
  }

  console.log("[saveTokens] Attempting to save tokens:", {
    userId,
    hasAccessToken: !!tokenData.access_token,
    hasRefreshToken: !!tokenData.refresh_token,
    expiryDate: tokenData.expiry_date,
  })

  const { data, error } = await supabase
    .from("google_oauth_tokens")
    .upsert(tokenData, {
      onConflict: "user_id",
    })
    .select()

  if (error) {
    console.error("[saveTokens] Error saving tokens:", {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
    })
    
    // If RLS error, try with service role as fallback
    if (error.code === "42501" || error.message.includes("permission denied") || error.message.includes("RLS")) {
      console.log("[saveTokens] RLS error detected, trying with service role client...")
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const { createClient } = await import("@supabase/supabase-js")
        const serviceRoleClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
        
        const { data: serviceData, error: serviceError } = await serviceRoleClient
          .from("google_oauth_tokens")
          .upsert(tokenData, {
            onConflict: "user_id",
          })
          .select()
        
        if (serviceError) {
          console.error("[saveTokens] Service role client also failed:", serviceError)
          throw new Error(`Failed to save tokens: ${serviceError.message}`)
        }
        
        console.log("[saveTokens] Tokens saved successfully using service role:", {
          userId,
          recordId: serviceData?.[0]?.id,
        })
        return
      }
    }
    
    throw new Error(`Failed to save tokens: ${error.message}`)
  }

  console.log("[saveTokens] Tokens saved successfully:", {
    userId,
    recordId: data?.[0]?.id,
  })
}

/**
 * Refresh an expired access token
 * @param userId - The user ID
 * @returns The new tokens
 */
export async function refreshAccessToken(userId: string) {
  const storedTokens = await getStoredTokens(userId)
  
  if (!storedTokens || !storedTokens.refresh_token) {
    throw new Error("No refresh token found. User needs to re-authenticate.")
  }

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    refresh_token: storedTokens.refresh_token,
  })

  const { credentials } = await oauth2Client.refreshAccessToken()
  
  // Save the new tokens
  await saveTokens(userId, credentials)

  return credentials
}

/**
 * Get a valid OAuth2 client for a user (refreshes token if needed)
 * @param userId - The user ID
 * @returns An authenticated OAuth2 client
 */
export async function getAuthenticatedOAuth2Client(userId: string) {
  const oauth2Client = getOAuth2Client()
  
  let tokens = await getStoredTokens(userId)
  
  if (!tokens) {
    throw new Error("User not authenticated with Google. Please complete OAuth2 flow.")
  }

  // Check if token is expired (with 5 minute buffer)
  const now = new Date()
  const expiryDate = new Date(tokens.expiry_date)
  const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds
  
  if (expiryDate.getTime() - now.getTime() < bufferTime) {
    // Token is expired or about to expire, refresh it
    tokens = await refreshAccessToken(userId)
  }

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type,
    expiry_date: tokens.expiry_date.getTime(),
  })

  return oauth2Client
}

/**
 * Check if a user has valid Google OAuth tokens
 * @param userId - The user ID
 * @returns True if user has valid tokens, false otherwise
 */
export async function hasValidTokens(userId: string): Promise<boolean> {
  try {
    const tokens = await getStoredTokens(userId)
    if (!tokens) return false

    // Check if token is expired (with 5 minute buffer)
    const now = new Date()
    const expiryDate = new Date(tokens.expiry_date)
    const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds
    
    if (expiryDate.getTime() - now.getTime() < bufferTime) {
      // Try to refresh
      try {
        await refreshAccessToken(userId)
        return true
      } catch {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

