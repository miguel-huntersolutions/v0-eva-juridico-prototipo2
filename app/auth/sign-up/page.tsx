"use client"

import type React from "react"
import { logger } from "@/lib/logger"

import { createClient } from "@/lib/supabase/client"
import { getOrganizations, type OrganizationMapped } from "@/lib/supabase/client-data-access"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { FileText, Chrome, Loader2, Building2 } from "lucide-react"

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("")
  const [organizations, setOrganizations] = useState<OrganizationMapped[]>([])
  const [loadingOrganizations, setLoadingOrganizations] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const pageLoadTime = useRef(Date.now())

  useEffect(() => {
    logger.pageView("/auth/sign-up")
    return () => {
      logger.pageLoaded("/auth/sign-up", Date.now() - pageLoadTime.current)
    }
  }, [])

  useEffect(() => {
    async function loadOrganizations() {
      try {
        setLoadingOrganizations(true)
        const orgs = await getOrganizations()
        // Only show active organizations
        const activeOrgs = orgs.filter((org) => org.status === "active")
        setOrganizations(activeOrgs)
        console.log("[SignUp] Loaded organizations:", activeOrgs.length)
      } catch (err) {
        console.error("[SignUp] Error loading organizations:", err)
        setError(err instanceof Error ? err.message : "Error al cargar las organizaciones. Por favor, recarga la página.")
      } finally {
        setLoadingOrganizations(false)
      }
    }
    loadOrganizations()
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    logger.action("/auth/sign-up", "SIGNUP_ATTEMPT", undefined, undefined, { email })

    if (!selectedOrganizationId) {
      setError("Debes seleccionar una organización")
      setIsLoading(false)
      return
    }

    if (password !== repeatPassword) {
      logger.warn("/auth/sign-up", "Passwords do not match")
      setError("Las contraseñas no coinciden")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      logger.warn("/auth/sign-up", "Password too short")
      setError("La contraseña debe tener al menos 6 caracteres")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            name: name,
            role: "member",
            organization_id: selectedOrganizationId, // Store organization in user metadata
          },
        },
      })
      if (error) throw error
      logger.action("/auth/sign-up", "SIGNUP_SUCCESS", undefined, undefined, { email, organizationId: selectedOrganizationId })
      // Redirect to success page with message about approval
      router.push("/auth/sign-up-success?pending=true")
    } catch (error: unknown) {
      logger.error("/auth/sign-up", "Signup failed", error)
      setError(error instanceof Error ? error.message : "Ocurrió un error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    if (!selectedOrganizationId) {
      setError("Debes seleccionar una organización")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    logger.action("/auth/sign-up", "GOOGLE_SIGNUP_ATTEMPT", undefined, undefined, { organizationId: selectedOrganizationId })

    // Store organization in sessionStorage to retrieve it in the callback
    sessionStorage.setItem("signup_organization_id", selectedOrganizationId)

    try {
      // Use environment variable if available, otherwise use window.location.origin
      const redirectUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${redirectUrl}/auth/callback?org=${selectedOrganizationId}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        logger.error("/auth/sign-up", "Google signup failed", error)
        setError("Error al registrarse con Google. Intenta de nuevo.")
        setIsLoading(false)
      }
      // Note: signInWithOAuth redirects the user, so we don't need to handle success here
    } catch (error: unknown) {
      logger.error("/auth/sign-up", "Google signup exception", error)
      setError(error instanceof Error ? error.message : "Ocurrió un error")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">EVA Jurídico</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
              <CardDescription>Completa el formulario para registrarte</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="organization">Organización</Label>
                    <Select
                      value={selectedOrganizationId}
                      onValueChange={setSelectedOrganizationId}
                      disabled={loadingOrganizations}
                      required
                    >
                      <SelectTrigger id="organization">
                        <SelectValue placeholder={loadingOrganizations ? "Cargando organizaciones..." : "Selecciona una organización"} />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <span>{org.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {organizations.length === 0 && !loadingOrganizations && (
                      <p className="text-xs text-muted-foreground">No hay organizaciones disponibles</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Juan Pérez"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">Repetir Contraseña</Label>
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creando cuenta...
                      </span>
                    ) : (
                      "Crear Cuenta"
                    )}
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">O</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignUp}
                    disabled={isLoading}
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    Continuar con Google
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  ¿Ya tienes una cuenta?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
                    Iniciar Sesión
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
