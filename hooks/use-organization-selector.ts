"use client"

import * as React from "react"
import type { Organization } from "@/lib/supabase/client-data-access"

const SELECTED_ORG_KEY = "eva_selected_organization"

interface UseOrganizationSelectorOptions {
  userOrganizationId?: string | null
  isSuperadmin?: boolean
  isSimulatingAdmin?: boolean
}

export function useOrganizationSelector(options: UseOrganizationSelectorOptions) {
  const { userOrganizationId, isSuperadmin, isSimulatingAdmin } = options
  const [selectedOrganizationId, setSelectedOrganizationId] = React.useState<string | null>(null)
  const [selectedOrganization, setSelectedOrganization] = React.useState<Organization | null>(null)
  const [isLoaded, setIsLoaded] = React.useState(false)

  // Cargar organización seleccionada del localStorage al montar
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SELECTED_ORG_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Organization
          setSelectedOrganizationId(parsed.id)
          setSelectedOrganization(parsed)
        } catch {
          localStorage.removeItem(SELECTED_ORG_KEY)
        }
      }
      setIsLoaded(true)
    }
  }, [])

  // Determinar si necesita seleccionar organización
  const needsOrganizationSelection = React.useMemo(() => {
    // Si es superadmin simulando admin, siempre puede seleccionar
    if (isSuperadmin && isSimulatingAdmin) {
      return !selectedOrganizationId
    }
    // Si es admin normal sin organización asignada
    if (!userOrganizationId) {
      return !selectedOrganizationId
    }
    // Admin con una sola organización asignada, no necesita seleccionar
    return false
  }, [isSuperadmin, isSimulatingAdmin, userOrganizationId, selectedOrganizationId])

  // Obtener el ID de organización efectivo
  const effectiveOrganizationId = React.useMemo(() => {
    // Si es superadmin simulando admin, usar la seleccionada
    if (isSuperadmin && isSimulatingAdmin) {
      return selectedOrganizationId
    }
    // Si tiene organización seleccionada, usarla
    if (selectedOrganizationId) {
      return selectedOrganizationId
    }
    // Usar la organización del usuario
    return userOrganizationId || null
  }, [isSuperadmin, isSimulatingAdmin, selectedOrganizationId, userOrganizationId])

  const selectOrganization = React.useCallback((org: Organization) => {
    setSelectedOrganizationId(org.id)
    setSelectedOrganization(org)
    localStorage.setItem(SELECTED_ORG_KEY, JSON.stringify(org))
  }, [])

  const clearSelection = React.useCallback(() => {
    setSelectedOrganizationId(null)
    setSelectedOrganization(null)
    localStorage.removeItem(SELECTED_ORG_KEY)
  }, [])

  // Puede cambiar de organización si es superadmin simulando admin
  const canChangeOrganization = isSuperadmin && isSimulatingAdmin

  return {
    selectedOrganizationId,
    selectedOrganization,
    effectiveOrganizationId,
    needsOrganizationSelection,
    canChangeOrganization,
    isLoaded,
    selectOrganization,
    clearSelection,
  }
}
