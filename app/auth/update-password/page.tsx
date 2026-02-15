"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Lock, Eye, EyeOff } from "lucide-react"

function UpdatePasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isCheckingLink, setIsCheckingLink] = React.useState(true)
  const codeExchangedRef = React.useRef(false)

  // Support both: hash (#access_token=... or #code=...) and query (?code=...) from Supabase recovery email
  // Supabase 303 redirect may append code in query or fragment depending on flow
  React.useEffect(() => {
    const supabase = createBrowserClient()
    const hash = typeof window !== "undefined" ? window.location.hash.substring(1) : ""
    const hashParams = new URLSearchParams(hash)
    const codeFromQuery = searchParams.get("code")
    const codeFromHash = hashParams.get("code")
    const code = codeFromQuery || codeFromHash
    const accessToken = hashParams.get("access_token")
    const type = hashParams.get("type")
    const provider = hashParams.get("provider")

    if (code) {
      // PKCE recovery flow: exchange code for session
      supabase.auth
        .exchangeCodeForSession(code)
        .then(() => {
          codeExchangedRef.current = true
          setError(null)
          // Remove code from URL so it isn't reused (avoids second effect run showing "no link" after Strict Mode re-run)
          if (typeof window !== "undefined" && window.history.replaceState) {
            const url = new URL(window.location.href)
            url.searchParams.delete("code")
            const h = url.hash ? new URLSearchParams(url.hash.substring(1)) : null
            if (h) {
              h.delete("code")
              const newHash = h.toString() ? "#" + h.toString() : ""
              url.hash = newHash
            }
            window.history.replaceState({}, "", url.pathname + url.search + (url.hash || ""))
          }
        })
        .catch((err) => {
          console.error("exchangeCodeForSession error:", err)
          const msg =
            (err && typeof err === "object" && "message" in err ? (err as { message?: string }).message : null) ??
            (err && typeof err === "object" && "error_description" in err ? (err as { error_description?: string }).error_description : null) ??
            (typeof err === "string" ? err : "") ??
            ""
          const msgLower = msg.toLowerCase()
          const isPkceVerifierError =
            msgLower.includes("code verifier") ||
            msgLower.includes("code_verifier") ||
            (msgLower.includes("validation_failed") && msgLower.includes("non-empty"))
          const isExpiredError =
            msgLower.includes("expired") ||
            msgLower.includes("expirado") ||
            msgLower.includes("expir") ||
            msgLower.includes("otp_expired") ||
            msgLower.includes("already been used")
          if (isPkceVerifierError) {
            setError(
              "Este enlace debe abrirse en el mismo navegador donde solicitaste restablecer la contraseña. " +
                "Si lo abriste en otro dispositivo o pestaña, solicita un nuevo enlace desde esta página y abre el correo en este mismo navegador."
            )
          } else if (isExpiredError) {
            setError(
              "El enlace ha expirado o ya fue utilizado. Los enlaces de recuperación suelen ser válidos 1 hora. " +
                "Solicita un nuevo enlace desde el botón de abajo."
            )
          } else {
            setError("Enlace inválido o expirado. Por favor, solicita un nuevo enlace de recuperación.")
          }
        })
        .finally(() => {
          setIsCheckingLink(false)
        })
      return
    }

    // Hash-based flow (invite or recovery with tokens in fragment)
    // If we already exchanged a code in this session, don't show error (effect re-ran after we removed ?code= from URL)
    if (!accessToken) {
      if (codeExchangedRef.current) {
        setIsCheckingLink(false)
        return
      }
      setError(
        "No se recibió el enlace de recuperación correctamente. " +
          "Abre el enlace del correo en el mismo navegador donde solicitaste restablecer la contraseña, o solicita un nuevo enlace."
      )
      setIsCheckingLink(false)
      return
    }

    if (provider === "google" || type === "signup") {
      router.push(`/auth/callback${window.location.hash}`)
      setIsCheckingLink(false)
      return
    }

    if (type && type !== "recovery" && type !== "invite") {
      router.push(`/auth/callback${window.location.hash}`)
    }
    setIsCheckingLink(false)
  }, [router, searchParams])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password || !confirmPassword) {
      setError("Por favor, completa todos los campos")
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    try {
      setIsLoading(true)
      const supabase = createBrowserClient()

      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const provider = hashParams.get("provider")

      // If we don't have hash tokens, we may already have a session (e.g. from ?code=... exchange)
      if (!accessToken || !refreshToken) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Session from code exchange; just update password
          const { error: updateError } = await supabase.auth.updateUser({ password })
          if (updateError) {
            setError(updateError.message || "Error al actualizar la contraseña")
            setIsLoading(false)
            return
          }
          const { data: profileData } = await supabase.from("profiles").select("role, status").eq("id", user.id).single()
          const profile = profileData
          if (!profile || profile.status !== "approved") {
            await supabase.auth.signOut()
            router.push("/auth/login?error=account_pending")
            return
          }
          const role = profile?.role || "member"
          if (role === "superadmin") router.push("/superadmin")
          else if (role === "admin") router.push("/admin")
          else router.push("/member")
          return
        }
        setError("Enlace inválido o expirado. Por favor, solicita una nueva invitación.")
        setIsLoading(false)
        return
      }

      if (provider === "google") {
        router.push(`/auth/callback${window.location.hash}`)
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError) {
        setError("Error al procesar el enlace. Por favor, solicita una nueva invitación.")
        setIsLoading(false)
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message || "Error al actualizar la contraseña")
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

      // Get user profile
      let profile = null
      let attempts = 0
      while (!profile && attempts < 5) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", user.id)
          .single()

        if (profileData) {
          profile = profileData
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 200))
        attempts++
      }

      // Check if user is approved
      if (!profile || profile.status !== "approved") {
        await supabase.auth.signOut()
        router.push("/auth/login?error=account_pending")
        return
      }

      // Redirect based on role
      const role = profile?.role || "member"
      if (role === "superadmin") {
        router.push("/superadmin")
      } else if (role === "admin") {
        router.push("/admin")
      } else {
        router.push("/member")
      }
    } catch (err) {
      console.error("Error updating password:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      setIsLoading(false)
    }
  }

  if (isCheckingLink) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando enlace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Enlace no válido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/auth/forgot-password">Solicitar nuevo enlace</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Establecer Contraseña</CardTitle>
          <CardDescription>
            Establece una contraseña para tu cuenta. Debe tener al menos 6 caracteres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Estableciendo contraseña...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Establecer Contraseña
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      }
    >
      <UpdatePasswordContent />
    </Suspense>
  )
}

