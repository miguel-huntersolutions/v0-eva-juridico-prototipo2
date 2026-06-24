/**
 * Google OAuth2 integration
 * Handles OAuth2 authentication flow and token management
 */

import { google } from "googleapis"
import { createServerClient } from "@/lib/supabase/server"

function getGoogleOAuthEnv() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID?.trim(),
    clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
    redirectUri: process.env.GOOGLE_REDIRECT_URI?.trim(),
  }
}

/** Masked config for debugging invalid_client (no secrets exposed). */
export function getGoogleOAuthConfigCheck() {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthEnv()
  return {
    hasClientId: Boolean(clientId),
    clientIdHint: clientId ? `${clientId.slice(0, 8)}...${clientId.slice(-12)}` : null,
    hasClientSecret: Boolean(clientSecret),
    clientSecretLength: clientSecret?.length ?? 0,
    redirectUri: redirectUri ?? null,
  }
}

// Initialize OAuth2 client
export function getOAuth2Client() {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthEnv()
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

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

/** Normalize DB row to tokens shape */
function toTokens(data: { access_token: string; refresh_token: string; expiry_date: string; token_type?: string; scope?: string }) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: new Date(data.expiry_date),
    token_type: data.token_type || "Bearer",
    scope: data.scope,
  }
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

  return toTokens(data)
}

/**
 * Get stored tokens for a user using service role (bypasses RLS).
 * Use in server-side background tasks (e.g. RAG ingest) where request session may not apply.
 */
export async function getStoredTokensWithServiceRole(userId: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null
  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase
    .from("google_oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .single()
  if (error || !data) return null
  return toTokens(data)
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

  const { data, error } = await supabase
    .from("google_oauth_tokens")
    .upsert(tokenData, {
      onConflict: "user_id",
    })
    .select()

  if (error) {
    if (error.code === "42501" || error.message.includes("permission denied") || error.message.includes("RLS")) {
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
          throw new Error(`Failed to save tokens: ${serviceError.message}`)
        }
        return
      }
    }
    
    throw new Error(`Failed to save tokens: ${error.message}`)
  }
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
 * Refresh access token using service role (for server-side use when reading tokens with service role).
 */
export async function refreshAccessTokenWithServiceRole(userId: string) {
  const storedTokens = await getStoredTokensWithServiceRole(userId)
  if (!storedTokens?.refresh_token) {
    throw new Error("No refresh token found. User needs to re-authenticate.")
  }
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: storedTokens.refresh_token })
  const { credentials } = await oauth2Client.refreshAccessToken()

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  await supabase.from("google_oauth_tokens").upsert(
    {
      user_id: userId,
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token ?? storedTokens.refresh_token,
      token_type: credentials.token_type || "Bearer",
      expiry_date: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : new Date(Date.now() + 3600 * 1000).toISOString(),
      scope: credentials.scope || storedTokens.scope,
    },
    { onConflict: "user_id" },
  )
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
 * Get OAuth2 client for a user using service role to read/refresh tokens (bypasses RLS).
 * Use in server-side background tasks (e.g. RAG ingest) so any user's tokens can be used.
 */
export async function getAuthenticatedOAuth2ClientForServer(userId: string) {
  const oauth2Client = getOAuth2Client()
  let tokens = await getStoredTokensWithServiceRole(userId)
  if (!tokens) {
    throw new Error("User not authenticated with Google. Please complete OAuth2 flow.")
  }
  const now = new Date()
  const bufferTime = 5 * 60 * 1000
  if (new Date(tokens.expiry_date).getTime() - now.getTime() < bufferTime) {
    const credentials = await refreshAccessTokenWithServiceRole(userId)
    tokens = {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token || tokens.refresh_token,
      token_type: credentials.token_type || "Bearer",
      expiry_date: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600 * 1000),
      scope: credentials.scope || tokens.scope,
    }
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

