"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createBrowserClient()
        
        // Get the hash from the URL (Supabase puts tokens in the hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const errorParam = hashParams.get("error")
        const errorDescription = hashParams.get("error_description")

        // Check for errors in hash
        if (errorParam) {
          setError(errorDescription || errorParam)
          setIsLoading(false)
          return
        }

        // Check for errors in query params
        const queryError = searchParams.get("error")
        if (queryError) {
          setError(searchParams.get("error_description") || queryError)
          setIsLoading(false)
          return
        }

        // If we have tokens in the hash, set the session
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            setError(sessionError.message)
            setIsLoading(false)
            return
          }

          // Get user profile to determine redirect
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            setError("No se pudo obtener la información del usuario")
            setIsLoading(false)
            return
          }

          // Get user profile to check role
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

          const role = profile?.role || "member"
          const isInvite = searchParams.get("invite") === "true"
          const orgId = searchParams.get("org")

          // Redirect based on role
          if (role === "superadmin") {
            router.push("/superadmin")
          } else if (role === "admin") {
            router.push("/admin")
          } else {
            // For members, check if this is an invitation
            if (isInvite && orgId) {
              // Redirect to member dashboard
              router.push("/member")
            } else {
              router.push("/member")
            }
          }
        } else {
          // No tokens, check if we're already authenticated
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            // Already authenticated, redirect based on role
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .single()

            const role = profile?.role || "member"
            if (role === "superadmin") {
              router.push("/superadmin")
            } else if (role === "admin") {
              router.push("/admin")
            } else {
              router.push("/member")
            }
          } else {
            setError("No se recibieron tokens de autenticación")
            setIsLoading(false)
          }
        }
      } catch (err) {
        console.error("Error in auth callback:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
        setIsLoading(false)
      }
    }

    handleCallback()
  }, [router, searchParams])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Procesando invitación...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-destructive font-medium">Error al procesar la invitación</p>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => router.push("/auth/login")}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Ir al login
          </button>
        </div>
      </div>
    )
  }

  return null
}

