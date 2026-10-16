"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"

export interface OrganizationBranding {
  id: string
  name: string
  nit?: string | null
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
}

/** Evento que dispara la página de configuración tras guardar, para refrescar la marca sin recargar. */
export const ORGANIZATION_UPDATED_EVENT = "lexia:organization-updated"

const PRIMARY_VARS = ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring", "--chart-1"]
const PRIMARY_FG_VARS = ["--primary-foreground", "--sidebar-primary-foreground"]
const SECONDARY_VARS = ["--accent", "--chart-2"]
const SECONDARY_FG_VARS = ["--accent-foreground"]
const ALL_VARS = [...PRIMARY_VARS, ...PRIMARY_FG_VARS, ...SECONDARY_VARS, ...SECONDARY_FG_VARS]

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

/** Texto blanco o casi negro según la luminancia del fondo (WCAG). */
export function readableForeground(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.4 ? "#111827" : "#ffffff"
}

/**
 * Sobrescribe las variables de tema (globals.css) con los colores de la organización.
 * El estilo inline en <html> tiene prioridad sobre :root y .dark, así que aplica a ambos temas.
 */
export function applyOrganizationColors(org: Pick<OrganizationBranding, "primary_color" | "secondary_color"> | null) {
  const style = document.documentElement.style
  ALL_VARS.forEach((v) => style.removeProperty(v))
  if (!org) return

  if (org.primary_color && HEX_COLOR.test(org.primary_color)) {
    PRIMARY_VARS.forEach((v) => style.setProperty(v, org.primary_color!))
    PRIMARY_FG_VARS.forEach((v) => style.setProperty(v, readableForeground(org.primary_color!)))
  }
  if (org.secondary_color && HEX_COLOR.test(org.secondary_color)) {
    SECONDARY_VARS.forEach((v) => style.setProperty(v, org.secondary_color!))
    SECONDARY_FG_VARS.forEach((v) => style.setProperty(v, readableForeground(org.secondary_color!)))
  }
}

const cache = new Map<string, OrganizationBranding>()

/**
 * Carga la organización activa y aplica sus colores mientras el componente está montado.
 * Al desmontarse (p. ej. al cerrar sesión) vuelve a los colores por defecto.
 */
export function useOrganizationBranding(organizationId: string | null | undefined) {
  const [organization, setOrganization] = React.useState<OrganizationBranding | null>(
    organizationId ? (cache.get(organizationId) ?? null) : null,
  )

  React.useEffect(() => {
    if (!organizationId) {
      setOrganization(null)
      return
    }
    let cancelled = false
    const cached = cache.get(organizationId)
    if (cached) setOrganization(cached)

    // select("*") para no romper si la migración 028 aún no se aplicó.
    createClient()
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return
        cache.set(organizationId, data as OrganizationBranding)
        setOrganization(data as OrganizationBranding)
      })

    const onUpdated = (event: Event) => {
      const updated = (event as CustomEvent<OrganizationBranding>).detail
      if (updated?.id !== organizationId) return
      cache.set(organizationId, updated)
      setOrganization(updated)
    }
    window.addEventListener(ORGANIZATION_UPDATED_EVENT, onUpdated)
    return () => {
      cancelled = true
      window.removeEventListener(ORGANIZATION_UPDATED_EVENT, onUpdated)
    }
  }, [organizationId])

  React.useEffect(() => {
    applyOrganizationColors(organization)
  }, [organization])

  React.useEffect(() => () => applyOrganizationColors(null), [])

  return organization
}
