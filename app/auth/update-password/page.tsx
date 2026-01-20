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

  React.useEffect(() => {
    // Check if we have the necessary tokens in the hash
    const hash = window.location.hash.substring(1)
    const hashParams = new URLSearchParams(hash)
    const accessToken = hashParams.get("access_token")
    const type = hashParams.get("type")
    const provider = hashParams.get("provider")

    // If no access token, show error
    if (!accessToken) {
      setError("Enlace inválido o expirado. Por favor, solicita una nueva invitación.")
      return
    }

    // If user comes from Google OAuth, they don't need to set a password
    // Redirect them directly to the callback to complete authentication
    if (provider === "google" || type === "signup") {
      router.push(`/auth/callback${window.location.hash}`)
      return
    }

    // If type is not 'recovery' or 'invite', check if user already has password
    // For invite type, we should always show password setup
    if (type && type !== "recovery" && type !== "invite") {
      // User might already be authenticated, redirect to callback
      router.push(`/auth/callback${window.location.hash}`)
    }
  }, [router])

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

      // Get tokens from hash
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const provider = hashParams.get("provider")

      if (!accessToken || !refreshToken) {
        setError("Enlace inválido o expirado. Por favor, solicita una nueva invitación.")
        setIsLoading(false)
        return
      }

      // If user authenticated with Google, they don't need to set a password
      if (provider === "google") {
        // Redirect to callback to complete authentication
        router.push(`/auth/callback${window.location.hash}`)
        return
      }

      // Set session first to authenticate the user
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

