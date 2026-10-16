"use client"

import * as React from "react"
import { Building2, CheckCircle2, ImageUp, Loader2, RotateCcw, Save, TriangleAlert } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProfile } from "@/hooks/use-profile"
import { useRoleSwitcher } from "@/hooks/use-role-switcher"
import { useOrganizationSelector } from "@/hooks/use-organization-selector"
import { isPlatformSuperadmin } from "@/lib/auth/superadmin-scope"
import {
  ORGANIZATION_UPDATED_EVENT,
  readableForeground,
  type OrganizationBranding,
} from "@/lib/organization-branding"

type FormState = {
  name: string
  nit: string
  email: string
  phone: string
  address: string
  website: string
  primary_color: string
  secondary_color: string
}

const DEFAULT_PRIMARY = "#4f46e5"
const DEFAULT_SECONDARY = "#0d9488"
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function toForm(org: OrganizationBranding): FormState {
  return {
    name: org.name ?? "",
    nit: org.nit ?? "",
    email: org.email ?? "",
    phone: org.phone ?? "",
    address: org.address ?? "",
    website: org.website ?? "",
    primary_color: org.primary_color ?? "",
    secondary_color: org.secondary_color ?? "",
  }
}

type Message = { type: "success" | "error"; text: string } | null

export function OrganizationSettingsPage() {
  const { profile, isLoading: profileLoading } = useProfile()
  // Misma resolución de organización que app/admin/layout.tsx
  const platformSa = isPlatformSuperadmin(profile)
  const { isSimulating } = useRoleSwitcher(profile?.role, platformSa)
  const { effectiveOrganizationId, isLoaded: orgLoaded } = useOrganizationSelector({
    userOrganizationId: profile?.organization_id,
    isSuperadmin: platformSa,
    isSimulatingAdmin: isSimulating && platformSa,
  })

  const [organization, setOrganization] = React.useState<OrganizationBranding | null>(null)
  const [form, setForm] = React.useState<FormState | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [message, setMessage] = React.useState<Message>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const publish = (org: OrganizationBranding) => {
    setOrganization(org)
    setForm(toForm(org))
    window.dispatchEvent(new CustomEvent(ORGANIZATION_UPDATED_EVENT, { detail: org }))
  }

  React.useEffect(() => {
    if (profileLoading || !orgLoaded) return
    if (!effectiveOrganizationId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/organization-settings?organizationId=${encodeURIComponent(effectiveOrganizationId)}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.message || json.error || "No se pudo cargar la organización")
        setOrganization(json.organization)
        setForm(toForm(json.organization))
      })
      .catch((err: Error) => setMessage({ type: "error", text: err.message }))
      .finally(() => setLoading(false))
  }, [profileLoading, orgLoaded, effectiveOrganizationId])

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => (f ? { ...f, [field]: e.target.value } : f))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !effectiveOrganizationId) return
    for (const key of ["primary_color", "secondary_color"] as const) {
      if (form[key] && !HEX_COLOR.test(form[key])) {
        setMessage({ type: "error", text: "Los colores deben tener formato #RRGGBB" })
        return
      }
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/organization-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: effectiveOrganizationId, ...form }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || "No se pudo guardar")
      publish(json.organization)
      setMessage({ type: "success", text: "Datos de la organización guardados" })
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo guardar" })
    } finally {
      setSaving(false)
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !effectiveOrganizationId) return
    setUploading(true)
    setMessage(null)
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("organizationId", effectiveOrganizationId)
      const res = await fetch("/api/organization-settings/logo", { method: "POST", body })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || "No se pudo subir el logo")
      // Conserva lo que el usuario está editando y actualiza solo el logo.
      setOrganization(json.organization)
      window.dispatchEvent(new CustomEvent(ORGANIZATION_UPDATED_EVENT, { detail: json.organization }))
      setMessage({ type: "success", text: "Logo actualizado" })
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo subir el logo" })
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!effectiveOrganizationId) return
    setUploading(true)
    try {
      const res = await fetch("/api/organization-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: effectiveOrganizationId, logo_url: null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error)
      setOrganization(json.organization)
      window.dispatchEvent(new CustomEvent(ORGANIZATION_UPDATED_EVENT, { detail: json.organization }))
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo quitar el logo" })
    } finally {
      setUploading(false)
    }
  }

  if (loading || profileLoading || !orgLoaded) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!effectiveOrganizationId || !form || !organization) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <PageHeader title="Mi Organización" />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>{message?.text || "No hay una organización asociada a tu cuenta."}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const previewPrimary = HEX_COLOR.test(form.primary_color) ? form.primary_color : DEFAULT_PRIMARY
  const previewSecondary = HEX_COLOR.test(form.secondary_color) ? form.secondary_color : DEFAULT_SECONDARY

  return (
    <form onSubmit={handleSave} className="space-y-6 p-6 lg:p-8">
      <PageHeader title="Mi Organización" description="Datos, logo y colores que verán todos los miembros de tu organización">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar cambios
        </Button>
      </PageHeader>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          {message.type === "error" ? <TriangleAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Datos de la organización</CardTitle>
            <CardDescription>Información de contacto e identificación</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="org-name">Nombre *</Label>
              <Input id="org-name" value={form.name} onChange={update("name")} required maxLength={300} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-nit">NIT *</Label>
              <Input id="org-nit" value={form.nit} onChange={update("nit")} required maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-phone">Teléfono</Label>
              <Input id="org-phone" type="tel" value={form.phone} onChange={update("phone")} maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-email">Correo de contacto</Label>
              <Input id="org-email" type="email" value={form.email} onChange={update("email")} maxLength={300} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-website">Sitio web</Label>
              <Input
                id="org-website"
                type="url"
                placeholder="https://"
                value={form.website}
                onChange={update("website")}
                maxLength={300}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="org-address">Dirección</Label>
              <Input id="org-address" value={form.address} onChange={update("address")} maxLength={300} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>PNG, JPG o WEBP, máximo 2 MB. Se recomienda fondo transparente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-white p-3">
              {organization.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt={`Logo de ${organization.name}`}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <Building2 className="h-10 w-10 text-gray-300" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                {organization.logo_url ? "Cambiar logo" : "Subir logo"}
              </Button>
              {organization.logo_url && (
                <Button type="button" variant="ghost" disabled={uploading} onClick={handleRemoveLogo}>
                  Quitar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Colores de la empresa</CardTitle>
            <CardDescription>
              Se aplican a botones, enlaces y elementos destacados de la aplicación para todos los miembros. Déjalos vacíos
              para usar los colores por defecto.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            {(
              [
                ["primary_color", "Color principal", DEFAULT_PRIMARY],
                ["secondary_color", "Color secundario", DEFAULT_SECONDARY],
              ] as const
            ).map(([field, label, fallback]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>{label}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label={`${label} (selector)`}
                    value={HEX_COLOR.test(form[field]) ? form[field] : fallback}
                    onChange={update(field)}
                    className="h-10 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                  />
                  <Input
                    id={field}
                    value={form[field]}
                    onChange={update(field)}
                    placeholder="Por defecto"
                    maxLength={7}
                    className="font-mono"
                  />
                  {form[field] && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Restablecer ${label.toLowerCase()}`}
                      onClick={() => setForm((f) => (f ? { ...f, [field]: "" } : f))}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <Label>Vista previa</Label>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <span
                  className="rounded-md px-3 py-1.5 text-sm font-medium"
                  style={{ backgroundColor: previewPrimary, color: readableForeground(previewPrimary) }}
                >
                  Botón principal
                </span>
                <span
                  className="rounded-md px-3 py-1.5 text-sm font-medium"
                  style={{ backgroundColor: previewSecondary, color: readableForeground(previewSecondary) }}
                >
                  Secundario
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
