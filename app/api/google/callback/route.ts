import { NextRequest, NextResponse } from "next/server"
import { getTokensFromCode } from "@/lib/google/oauth"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

/**
 * GET /api/google/callback
 * Handles the OAuth2 callback from Google
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const error = searchParams.get("error")
    const state = searchParams.get("state")

    // Helper function to return error HTML for popup
    const errorHtml = (errorMessage: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error de autenticación</title>
        </head>
        <body>
          <script>
            localStorage.setItem('google_auth_error', ${JSON.stringify(errorMessage)});
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'google_auth_error',
              newValue: ${JSON.stringify(errorMessage)}
            }));
            setTimeout(() => window.close(), 2000);
          </script>
          <h1>Error: ${errorMessage}</h1>
          <p>Esta ventana se cerrará automáticamente.</p>
        </body>
      </html>
    `

    if (error) {
      return new NextResponse(errorHtml(`Error de Google: ${error}`), {
        headers: { "Content-Type": "text/html" },
      })
    }

    if (!code) {
      return new NextResponse(errorHtml("Código de autorización faltante"), {
        headers: { "Content-Type": "text/html" },
      })
    }

    // Try to get userId from state parameter first (more reliable in popup context)
    let userId: string | null = null
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(decodeURIComponent(state), "base64").toString())
        userId = decodedState.userId
        console.log("[google/callback] UserId from state:", userId)
      } catch (stateError) {
        console.warn("[google/callback] Could not decode state:", stateError)
      }
    }

    // Fallback: Try to get user from session (may not work in popup)
    if (!userId) {
      const supabase = await createServerClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error("[google/callback] Error getting user:", userError)
      } else if (user) {
        userId = user.id
        console.log("[google/callback] UserId from session:", userId)
      }
    }

    if (!userId) {
      console.error("[google/callback] No userId found in state or session")
      return new NextResponse(errorHtml("Usuario no autenticado. Por favor, inicia sesión primero."), {
        headers: { "Content-Type": "text/html" },
      })
    }

    console.log("[google/callback] Using userId:", userId)

    // Exchange code for tokens
    let tokens
    try {
      console.log("[google/callback] Exchanging code for tokens...")
      tokens = await getTokensFromCode(code)
      console.log("[google/callback] Tokens received:", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      })
    } catch (tokenError) {
      console.error("[google/callback] Error getting tokens:", tokenError)
      return new NextResponse(
        errorHtml(`Error al obtener tokens: ${tokenError instanceof Error ? tokenError.message : "Error desconocido"}`),
        { headers: { "Content-Type": "text/html" } },
      )
    }

    if (!tokens.access_token || !tokens.refresh_token) {
      console.error("[google/callback] Invalid tokens received:", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokens: tokens,
      })
      return new NextResponse(errorHtml("Tokens inválidos recibidos"), {
        headers: { "Content-Type": "text/html" },
      })
    }

    // Save tokens for the user using service role (more reliable in popup context)
    try {
      console.log("[google/callback] Saving tokens for user:", userId)
      
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serviceRoleKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
      }

      const serviceRoleClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      const tokenData = {
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || "Bearer",
        expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : new Date(Date.now() + 3600 * 1000).toISOString(),
        scope: tokens.scope || "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets",
      }

      const { data, error: saveError } = await serviceRoleClient
        .from("google_oauth_tokens")
        .upsert(tokenData, {
          onConflict: "user_id",
        })
        .select()

      if (saveError) {
        console.error("[google/callback] Error saving tokens:", saveError)
        throw new Error(`Failed to save tokens: ${saveError.message}`)
      }

      console.log("[google/callback] Tokens saved successfully:", {
        userId,
        recordId: data?.[0]?.id,
      })
    } catch (saveError) {
      console.error("[google/callback] Error saving tokens:", saveError)
      return new NextResponse(
        errorHtml(`Error al guardar tokens: ${saveError instanceof Error ? saveError.message : "Error desconocido"}`),
        { headers: { "Content-Type": "text/html" } },
      )
    }

    // Return an HTML page that sets localStorage and closes the popup
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Autenticación exitosa</title>
        </head>
        <body>
          <script>
            // Set success flag in localStorage
            localStorage.setItem('google_auth_success', 'true');
            // Trigger storage event for other windows
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'google_auth_success',
              newValue: 'true'
            }));
            // Close the popup
            window.close();
            // Fallback: if window.close() doesn't work, show message
            setTimeout(() => {
              document.body.innerHTML = '<h1>Autenticación exitosa. Puedes cerrar esta ventana.</h1>';
            }, 1000);
          </script>
        </body>
      </html>
    `
    
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  } catch (error) {
    console.error("Error handling OAuth2 callback:", error)
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error de autenticación</title>
        </head>
        <body>
          <script>
            localStorage.setItem('google_auth_error', ${JSON.stringify(errorMessage)});
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'google_auth_error',
              newValue: ${JSON.stringify(errorMessage)}
            }));
            setTimeout(() => window.close(), 2000);
          </script>
          <h1>Error: ${errorMessage}</h1>
          <p>Esta ventana se cerrará automáticamente.</p>
        </body>
      </html>
    `
    return new NextResponse(errorHtml, {
      headers: { "Content-Type": "text/html" },
    })
  }
}

