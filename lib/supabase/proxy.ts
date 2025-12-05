import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const SUPABASE_URL = "https://djamkpkuxneexoyvzyez.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqYW1rcGt1eG5lZXhveXZ6eWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NzIwMTAsImV4cCI6MjA4MDI0ODAxMH0.N9ZxBEIPFErtFQ9k79BugQkU8VqcHUd032Xt2X6E4AY"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    })

    // getSession reads from cookies locally without making a network request
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Protected routes - redirect to login if not authenticated
    const protectedPaths = ["/superadmin", "/admin", "/member", "/dashboard"]
    const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

    if (isProtectedPath && !session) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    // If user is logged in and tries to access auth pages, redirect based on role
    const authPaths = ["/auth/login", "/auth/sign-up", "/login"]
    const isAuthPath = authPaths.some((path) => request.nextUrl.pathname === path)

    if (isAuthPath && session) {
      // Don't redirect to dashboard, the page will handle it
      return supabaseResponse
    }
  } catch (error) {
    // This prevents the redirect loop when Supabase connection fails
    console.error("[middleware] Error checking session:", error)
    return supabaseResponse
  }

  return supabaseResponse
}
