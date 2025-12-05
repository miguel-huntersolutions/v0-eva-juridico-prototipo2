"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Building2, FileText, Shield, Scale, ArrowRight, Sparkles, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import type { UserRole } from "@/lib/mock-data"

interface ProfileOption {
  role: UserRole
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  borderColor: string
  route: string
  features: string[]
}

const profileOptions: ProfileOption[] = [
  {
    role: "superadmin",
    title: "Superadministrador",
    description: "Gestión global de la plataforma, organizaciones y configuración del sistema",
    icon: Shield,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30 hover:border-primary",
    route: "/superadmin",
    features: ["Organizaciones", "Plantillas", "Tipos de Proceso"],
  },
  {
    role: "admin",
    title: "Administrador",
    description: "Administración de bufete, entidades y equipo de trabajo",
    icon: Building2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30 hover:border-emerald-500",
    route: "/admin",
    features: ["Entidades", "Miembros", "Configuración"],
  },
  {
    role: "member",
    title: "Asesor Jurídico",
    description: "Gestión operativa de procesos, documentos y asistencia con IA",
    icon: Scale,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30 hover:border-amber-500",
    route: "/member",
    features: ["Procesos", "Documentos", "Asistente IA"],
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<"login" | "demo">("login")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Get user profile to determine redirect
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()

        const role = profile?.role || "member"
        const route = role === "superadmin" ? "/superadmin" : role === "admin" ? "/admin" : "/member"
        router.push(route)
      }
    } catch (err) {
      setError("Error al iniciar sesión")
      setIsLoading(false)
    }
  }

  const handleDemoLogin = (role: UserRole, route: string) => {
    setIsLoading(true)
    localStorage.setItem("eva_user_role", role)
    setTimeout(() => {
      router.push(route)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">EVA Jurídico</h1>
              <p className="text-xs text-muted-foreground">Plataforma de Gestión Legal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          {/* Mode Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg border border-border p-1">
              <button
                onClick={() => setMode("login")}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  mode === "login"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => setMode("demo")}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  mode === "demo"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Modo Demo
              </button>
            </div>
          </div>

          {mode === "login" ? (
            /* Login Form */
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-2">Bienvenido de nuevo</h2>
                <p className="text-muted-foreground">Ingresa tus credenciales para acceder</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
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

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Ingresando...
                    </span>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <a href="/auth/sign-up" className="text-sm text-primary hover:underline">
                  ¿No tienes cuenta? Regístrate
                </a>
              </div>
            </div>
          ) : (
            /* Demo Mode */
            <>
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">Demo Mode</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-3">Selecciona tu Perfil</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Elige el rol con el que deseas ingresar a la plataforma para explorar sus funcionalidades
                </p>
              </div>

              {/* Profile Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                {profileOptions.map((option) => {
                  return (
                    <button
                      key={option.role}
                      onClick={() => handleDemoLogin(option.role, option.route)}
                      disabled={isLoading}
                      className={cn(
                        "group relative flex flex-col rounded-2xl border-2 bg-card p-6 text-left transition-all duration-300",
                        "hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                        option.borderColor,
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl mb-4 transition-transform group-hover:scale-110",
                          option.bgColor,
                        )}
                      >
                        <option.icon className={cn("h-6 w-6", option.color)} />
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-lg font-semibold mb-1">{option.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{option.description}</p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {option.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* Arrow */}
                      <div className="mt-auto pt-4 border-t border-border/50 flex justify-end">
                        <ArrowRight
                          className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform",
                            "group-hover:translate-x-1 group-hover:text-foreground",
                          )}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Info Section */}
              <div className="mt-8 text-center">
                <p className="text-xs text-muted-foreground">
                  Esta es una versión de demostración. Los datos mostrados son ficticios.
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>© 2025 EVA Jurídico. Todos los derechos reservados.</span>
            <div className="flex items-center gap-4">
              <span>Versión 1.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
