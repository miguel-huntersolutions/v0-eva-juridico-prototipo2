"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Building2, FileText, Shield, Scale, ArrowRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { mockUsers, type UserRole } from "@/lib/mock-data"

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
  const [selectedRole, setSelectedRole] = React.useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleLogin = (role: UserRole, route: string) => {
    setSelectedRole(role)
    setIsLoading(true)

    // Simulate login delay
    setTimeout(() => {
      // Store selected role in localStorage for persistence
      localStorage.setItem("eva_user_role", role)
      router.push(route)
    }, 800)
  }

  const getUserByRole = (role: UserRole) => {
    return mockUsers.find((u) => u.role === role)
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
          {/* Welcome Section */}
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
              const user = getUserByRole(option.role)
              const isSelected = selectedRole === option.role
              const isLoadingThis = isLoading && isSelected

              return (
                <button
                  key={option.role}
                  onClick={() => handleLogin(option.role, option.route)}
                  disabled={isLoading}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border-2 bg-card p-6 text-left transition-all duration-300",
                    "hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                    option.borderColor,
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
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

                  {/* User Preview */}
                  {user && (
                    <div className="mt-auto pt-4 border-t border-border/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                          <AvatarFallback className={cn(option.bgColor, option.color, "text-xs")}>
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <ArrowRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            "group-hover:translate-x-1 group-hover:text-foreground",
                            isLoadingThis && "animate-pulse",
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Loading Overlay */}
                  {isLoadingThis && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-sm font-medium">Ingresando...</span>
                      </div>
                    </div>
                  )}
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
