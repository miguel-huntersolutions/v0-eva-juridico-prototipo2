import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Rutas de API que no se autentican con la sesión del usuario y por tanto no pasan
 * por el control de estado de perfil: canales externos (API key) y cron (CRON_SECRET).
 */
const STATUS_EXEMPT_API_PREFIXES = ["/api/mcp/", "/api/cron/"]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Use getUser() to prevent random logouts
  // Do not run code between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ["/superadmin", "/admin", "/member", "/dashboard"]
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Solo perfiles aprobados usan la app: un usuario pending/rejected con sesión válida
  // no puede llamar a la API ni abrir pantallas internas (las rutas con service role
  // saltan RLS, así que este control no puede depender solo de la base de datos).
  const pathname = request.nextUrl.pathname
  const isSessionApi = pathname.startsWith("/api/") && !STATUS_EXEMPT_API_PREFIXES.some((p) => pathname.startsWith(p))
  if (user && (isSessionApi || isProtectedPath)) {
    const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle()
    if (profile?.status !== "approved") {
      if (isSessionApi) {
        return NextResponse.json(
          { error: "Forbidden: la cuenta no está aprobada", code: "account_not_approved" },
          { status: 403 },
        )
      }
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.search = "?error=account_pending"
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is
  return supabaseResponse
}
