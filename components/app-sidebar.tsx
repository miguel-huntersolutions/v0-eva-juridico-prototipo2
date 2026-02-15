"use client"

import * as React from "react"
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
  ShieldCheck,
  UserCog,
  ArrowLeftRight,
  RefreshCw,
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import type { Profile, UserRole } from "@/lib/types/database"
import { useRoleSwitcher } from "@/hooks/use-role-switcher"
import { useOrganizationSelector } from "@/hooks/use-organization-selector"
import { useImpersonation } from "@/lib/impersonation-context"

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
  { title: "Usuarios pendientes", href: "/superadmin/pending-users", icon: Users, roles: ["superadmin"] },
  { title: "Organizaciones", href: "/superadmin/organizations", icon: Building2, roles: ["superadmin"] },
  { title: "Tipos de Proceso", href: "/superadmin/process-types", icon: FolderKanban, roles: ["superadmin"] },
  { title: "Plantillas", href: "/superadmin/templates", icon: FileStack, roles: ["superadmin"] },

  // Admin items
  { title: "Panel Principal", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { title: "Entidades", href: "/admin/entities", icon: Building, roles: ["admin"] },
  { title: "Procesos", href: "/admin/processes", icon: FolderKanban, roles: ["admin"] },
  { title: "Documentos", href: "/admin/documents", icon: FileText, roles: ["admin"] },
  { title: "Miembros", href: "/admin/members", icon: Users, roles: ["admin"] },

  // Member items
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
  full_name?: string
}

interface AppSidebarProps {
  profile?: Profile | null
  user?: UserData | null
  selectedOrganizationId?: string
}

export function AppSidebar({ profile, user, selectedOrganizationId }: AppSidebarProps) {
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

  const actualRole = userData.role || "member"
  const userName = userData.name || ("full_name" in userData ? (userData as any).full_name : "Usuario")
  const userAvatar =
    ("avatar_url" in userData ? userData.avatar_url : null) || ("avatar" in userData ? (userData as any).avatar : null)

  const { effectiveRole, canSwitchRole, isSimulating, switchToRole, resetRole } = useRoleSwitcher(actualRole)
  const { isImpersonating, impersonatedOrg, stopImpersonation } = useImpersonation()

  const { selectedOrganization, canChangeOrganization, clearSelection } = useOrganizationSelector({
    userOrganizationId: profile?.organization_id,
    isSuperadmin: actualRole === "superadmin",
    isSimulatingAdmin: isSimulating && effectiveRole === "admin",
  })

  const filteredItems = React.useMemo(() => {
    const filtered = navItems.filter((item) => item.roles.includes(effectiveRole))
    // Debug: log filtered items in development
    if (process.env.NODE_ENV === "development") {
      console.log("[Sidebar] Effective role:", effectiveRole, "Filtered items:", filtered.map((i) => i.href))
    }
    return filtered
  }, [effectiveRole])

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
    resetRole()
    clearSelection()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const handleRoleSwitch = (role: UserRole | null) => {
    switchToRole(role)
    if (role !== "admin") {
      clearSelection()
    }
    if (role === null || role === "superadmin") {
      router.push("/dashboard")
    } else if (role === "admin") {
      router.push("/dashboard")
    } else if (role === "member") {
      router.push("/member/dashboard")
    }
  }

  const handleChangeOrganization = () => {
    clearSelection()
    window.location.reload()
  }

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden">
      {/* Logo */}
      <div className="flex-shrink-0 flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <FileText className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">EVA Jurídico</span>
          <span className="text-xs text-sidebar-foreground/60">Gestión Legal</span>
        </div>
      </div>

      {/* Status Banners */}
      {(isImpersonating || isSimulating || (effectiveRole === "admin" && selectedOrganization)) && (
        <div className="flex-shrink-0 space-y-2 px-3 pt-3">
        {isImpersonating && impersonatedOrg && (
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-2">
            <div className="flex items-center gap-2 text-xs text-primary">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="font-medium">Suplantando: {impersonatedOrg.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1.5 h-6 w-full text-xs text-primary hover:text-primary hover:bg-primary/20"
              onClick={stopImpersonation}
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Salir de Suplantación
            </Button>
          </div>
        )}

        {isSimulating && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2">
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span className="font-medium">Modo vista: {getRoleLabel(effectiveRole)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1.5 h-6 w-full text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/20"
              onClick={() => handleRoleSwitch(null)}
            >
              <ShieldCheck className="mr-1.5 h-3 w-3" />
              Volver a Superadmin
            </Button>
          </div>
        )}

        {effectiveRole === "admin" && selectedOrganization && (
          <div className="rounded-lg bg-muted/50 border p-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="font-medium truncate">{selectedOrganization.name}</span>
            </div>
            {canChangeOrganization && (
              <Button variant="ghost" size="sm" className="mt-1.5 h-6 w-full text-xs" onClick={handleChangeOrganization}>
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Cambiar Organización
              </Button>
            )}
          </div>
        )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto px-3 py-4">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={`${item.href}-${item.title}`}
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
      <div className="flex-shrink-0 border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-sidebar-foreground/60">Apariencia</span>
          <ThemeToggle variant="switch" />
        </div>
      </div>

      {/* User Profile */}
      <div className="flex-shrink-0 border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-2 py-6 hover:bg-sidebar-accent">
              <Avatar className="h-9 w-9">
                <AvatarImage src={userAvatar || undefined} alt={userName} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {userName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium text-sidebar-foreground">{userName}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={cn("text-[10px] h-4", getRoleBadgeColor(effectiveRole))}>
                    {getRoleLabel(effectiveRole)}
                  </Badge>
                  {isImpersonating && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 bg-primary/20 text-primary border-primary/30"
                    >
                      Suplantando
                    </Badge>
                  )}
                  {isSimulating && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 bg-amber-500/20 text-amber-600 border-amber-500/30"
                    >
                      Vista
                    </Badge>
                  )}
                </div>
                {isImpersonating && impersonatedOrg && (
                  <span className="text-xs text-sidebar-foreground/60 mt-0.5 truncate w-full">
                    {impersonatedOrg.name}
                  </span>
                )}
              </div>
              <ChevronDown className="ml-auto h-4 w-4 text-sidebar-foreground/50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/account/profile")}>
              <UserCircle className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/account/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            {isImpersonating && impersonatedOrg && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={stopImpersonation}
                  className="bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Salir de Suplantación
                  <span className="ml-auto text-xs text-muted-foreground">{impersonatedOrg.name}</span>
                </DropdownMenuItem>
              </>
            )}
            {canChangeOrganization && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleChangeOrganization}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Cambiar Organización
                </DropdownMenuItem>
              </>
            )}
            {canSwitchRole && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Cambiar Vista
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => handleRoleSwitch(null)}
                      className={cn(!isSimulating && "bg-accent")}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                      Superadministrador
                      {!isSimulating && <span className="ml-auto text-xs text-muted-foreground">Actual</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRoleSwitch("admin")}
                      className={cn(effectiveRole === "admin" && isSimulating && "bg-accent")}
                    >
                      <UserCog className="mr-2 h-4 w-4 text-chart-2" />
                      Administrador
                      {effectiveRole === "admin" && isSimulating && (
                        <span className="ml-auto text-xs text-muted-foreground">Vista</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRoleSwitch("member")}
                      className={cn(effectiveRole === "member" && isSimulating && "bg-accent")}
                    >
                      <Users className="mr-2 h-4 w-4 text-chart-3" />
                      Asesor Jurídico
                      {effectiveRole === "member" && isSimulating && (
                        <span className="ml-auto text-xs text-muted-foreground">Vista</span>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}
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
