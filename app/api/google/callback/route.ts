import { NextRequest, NextResponse } from "next/server"
import { getTokensFromCode, saveTokens } from "@/lib/google/oauth"
import { createServerClient } from "@/lib/supabase/server"

/**
 * GET /api/google/callback
 * Handles the OAuth2 callback from Google
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const error = searchParams.get("error")

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

    // Get the authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse(errorHtml("Usuario no autenticado"), {
        headers: { "Content-Type": "text/html" },
      })
    }

    // Exchange code for tokens
    let tokens
    try {
      tokens = await getTokensFromCode(code)
    } catch (tokenError) {
      return new NextResponse(
        errorHtml(`Error al obtener tokens: ${tokenError instanceof Error ? tokenError.message : "Error desconocido"}`),
        { headers: { "Content-Type": "text/html" } },
      )
    }

    if (!tokens.access_token || !tokens.refresh_token) {
      return new NextResponse(errorHtml("Tokens inválidos recibidos"), {
        headers: { "Content-Type": "text/html" },
      })
    }

    // Save tokens for the user
    await saveTokens(user.id, tokens)

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

