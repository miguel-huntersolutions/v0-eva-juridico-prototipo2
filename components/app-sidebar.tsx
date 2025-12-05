"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Building2,
  FileText,
  FolderKanban,
  Home,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Users,
  Building,
  FileStack,
  ChevronDown,
  LogOut,
  UserCircle,
  Book,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import type { Profile, UserRole } from "@/lib/types/database"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  badge?: string
}

const navItems: NavItem[] = [
  // Superadmin items
  { title: "Panel Principal", href: "/dashboard", icon: LayoutDashboard, roles: ["superadmin"] },
  { title: "Organizaciones", href: "/superadmin/organizations", icon: Building2, roles: ["superadmin"] },
  { title: "Tipos de Proceso", href: "/superadmin/process-types", icon: FolderKanban, roles: ["superadmin"] },
  { title: "Plantillas", href: "/superadmin/templates", icon: FileStack, roles: ["superadmin"] },

  // Admin items
  { title: "Panel Principal", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { title: "Entidades", href: "/admin/entities", icon: Building, roles: ["admin"] },
  { title: "Miembros", href: "/admin/members", icon: Users, roles: ["admin"] },

  // Member items
  { title: "Seleccionar Entidad", href: "/dashboard", icon: Building, roles: ["member"] },
  { title: "Dashboard", href: "/member/dashboard", icon: Home, roles: ["member"] },
  { title: "Procesos", href: "/member/processes", icon: FolderKanban, roles: ["member"] },
  { title: "Documentos", href: "/member/documents", icon: FileText, roles: ["member"] },
  { title: "Asistente Jurídico", href: "/member/assistant", icon: MessageSquareText, roles: ["member"], badge: "IA" },

  { title: "Documentación", href: "/docs", icon: Book, roles: ["superadmin", "admin", "member"] },
]

interface UserData {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url?: string | null
  avatar?: string
}

interface AppSidebarProps {
  profile?: Profile | null
  user?: UserData | null
}

export function AppSidebar({ profile, user }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const userData = profile ||
    user || {
      id: "",
      name: "Usuario",
      email: "",
      role: "member" as UserRole,
      avatar_url: null,
    }

  const userRole = userData.role || "member"
  const userName = userData.name || "Usuario"
  const userAvatar =
    ("avatar_url" in userData ? userData.avatar_url : null) || ("avatar" in userData ? (userData as any).avatar : null)

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole))

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "superadmin":
        return "Superadministrador"
      case "admin":
        return "Administrador"
      case "member":
        return "Asesor Jurídico"
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "superadmin":
        return "bg-primary/20 text-primary border-primary/30"
      case "admin":
        return "bg-chart-2/20 text-chart-2 border-chart-2/30"
      case "member":
        return "bg-chart-3/20 text-chart-3 border-chart-3/30"
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <FileText className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">EVA Jurídico</span>
          <span className="text-xs text-sidebar-foreground/60">Gestión Legal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
              <span>{item.title}</span>
              {item.badge && (
                <Badge
                  variant="secondary"
                  className="ml-auto h-5 px-1.5 text-[10px] bg-primary/20 text-primary border-0"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-sidebar-foreground/60">Apariencia</span>
          <ThemeToggle variant="switch" />
        </div>
      </div>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-2 py-6 hover:bg-sidebar-accent">
              <Avatar className="h-9 w-9">
                <AvatarImage src={userAvatar || "/placeholder.svg"} alt={userName} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium text-sidebar-foreground">{userName}</span>
                <Badge variant="outline" className={cn("mt-0.5 text-[10px] h-4", getRoleBadgeColor(userRole))}>
                  {getRoleLabel(userRole)}
                </Badge>
              </div>
              <ChevronDown className="ml-auto h-4 w-4 text-sidebar-foreground/50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserCircle className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
