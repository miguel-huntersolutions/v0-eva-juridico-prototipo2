"use client"

import * as React from "react"
import type { UserRole } from "@/lib/types/database"

const SIMULATED_ROLE_KEY = "eva_simulated_role"

export function useRoleSwitcher(actualRole: UserRole | undefined, canSimulate = true) {
  const [simulatedRole, setSimulatedRole] = React.useState<UserRole | null>(null)
  const [isLoaded, setIsLoaded] = React.useState(false)

  // Cargar rol simulado del localStorage al montar
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SIMULATED_ROLE_KEY)
      if (saved && (saved === "admin" || saved === "member")) {
        setSimulatedRole(saved as UserRole)
      }
      setIsLoaded(true)
    }
  }, [])

  // El rol efectivo es el simulado (si existe y el usuario es superadmin de plataforma) o el actual
  const effectiveRole = React.useMemo(() => {
    if (actualRole === "superadmin" && canSimulate && simulatedRole) {
      return simulatedRole
    }
    return actualRole || "member"
  }, [actualRole, simulatedRole, canSimulate])

  // Solo superadmin de plataforma puede simular roles
  const canSwitchRole = actualRole === "superadmin" && canSimulate

  const switchToRole = React.useCallback((role: UserRole | null) => {
    if (role === null || role === "superadmin") {
      // Volver al rol original
      localStorage.removeItem(SIMULATED_ROLE_KEY)
      setSimulatedRole(null)
    } else {
      localStorage.setItem(SIMULATED_ROLE_KEY, role)
      setSimulatedRole(role)
    }
  }, [])

  const resetRole = React.useCallback(() => {
    localStorage.removeItem(SIMULATED_ROLE_KEY)
    setSimulatedRole(null)
  }, [])

  return {
    actualRole,
    effectiveRole,
    simulatedRole,
    canSwitchRole,
    isSimulating: simulatedRole !== null,
    isLoaded,
    switchToRole,
    resetRole,
  }
}
