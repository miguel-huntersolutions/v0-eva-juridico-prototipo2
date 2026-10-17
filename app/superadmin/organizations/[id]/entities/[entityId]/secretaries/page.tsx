"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppSidebar } from "@/components/app-sidebar"
import { PageHeader } from "@/components/page-header"
import {
  SecretariesEditor,
  emptySecretaryForm,
  type SecretaryForm,
} from "@/components/secretaries-editor"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import {
  getOrganizations,
  getEntities,
  getSecretaries,
  createSecretary,
  updateSecretary,
  deleteSecretary,
  type OrganizationMapped,
  type EntityMapped,
} from "@/lib/supabase/client-data-access"

export default function EntitySecretariesPage({
  params,
}: {
  params: Promise<{ id: string; entityId: string }>
}) {
  const router = useRouter()
  const { id: organizationId, entityId } = React.use(params)
  const { profile, isLoading: profileLoading } = useProfile()
  const { isImpersonating } = useImpersonation()

  const [organization, setOrganization] = React.useState<OrganizationMapped | null>(null)
  const [entity, setEntity] = React.useState<EntityMapped | null>(null)
  const [secretaries, setSecretaries] = React.useState<SecretaryForm[]>([emptySecretaryForm()])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [orgs, entitiesData] = await Promise.all([
          getOrganizations(),
          getEntities(organizationId),
        ])

        if (cancelled) return

        const org = orgs.find((o) => o.id === organizationId) || null
        const foundEntity = entitiesData.find((e) => e.id === entityId) || null
        setOrganization(org)
        setEntity(foundEntity)

        if (!foundEntity) {
          setError("Entidad no encontrada")
          setSecretaries([emptySecretaryForm()])
          return
        }

        const entitySecretaries = await getSecretaries(entityId)
        if (cancelled) return

        const forms = entitySecretaries.map((s) => ({
          id: s.id,
          name: s.name || "",
          secretaryName: s.secretary_name || "",
          email: s.email || "",
          phone: s.phone || "",
        }))
        setSecretaries(forms.length > 0 ? forms : [emptySecretaryForm()])
      } catch (err) {
        console.error("[EntitySecretariesPage] Error loading:", err)
        if (!cancelled) setError("Error al cargar las secretarías")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [organizationId, entityId])

  const updateSecretaryField = (index: number, field: keyof SecretaryForm, value: string) => {
    setSecretaries((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
    setSuccess(false)
  }

  const addSecretaryField = () => {
    setSecretaries((prev) => [...prev, emptySecretaryForm()])
    setSuccess(false)
  }

  const removeSecretaryField = (index: number) => {
    setSecretaries((prev) => prev.filter((_, i) => i !== index))
    setSuccess(false)
  }

  const handleSave = async () => {
    if (!entity) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const existingSecretaries = await getSecretaries(entity.id)
      const formSecretaryIds: string[] = []

      for (const secretaryForm of secretaries) {
        if (!secretaryForm.name && !secretaryForm.secretaryName && !secretaryForm.email) {
          continue
        }

        if (secretaryForm.id) {
          const existing = existingSecretaries.find((s) => s.id === secretaryForm.id)
          if (existing) {
            const updated = await updateSecretary(existing.id, {
              name: secretaryForm.name,
              secretaryName: secretaryForm.secretaryName,
              email: secretaryForm.email,
              phone: secretaryForm.phone,
            })
            formSecretaryIds.push(updated.id)
          } else {
            const created = await createSecretary({
              name: secretaryForm.name,
              secretaryName: secretaryForm.secretaryName,
              email: secretaryForm.email,
              phone: secretaryForm.phone,
              entityId: entity.id,
            })
            formSecretaryIds.push(created.id)
          }
        } else {
          const created = await createSecretary({
            name: secretaryForm.name,
            secretaryName: secretaryForm.secretaryName,
            email: secretaryForm.email,
            phone: secretaryForm.phone,
            entityId: entity.id,
          })
          formSecretaryIds.push(created.id)
        }
      }

      const toDelete = existingSecretaries.filter((s) => !formSecretaryIds.includes(s.id))
      for (const secretary of toDelete) {
        await deleteSecretary(secretary.id)
      }

      const refreshed = await getSecretaries(entity.id)
      const forms = refreshed.map((s) => ({
        id: s.id,
        name: s.name || "",
        secretaryName: s.secretary_name || "",
        email: s.email || "",
        phone: s.phone || "",
      }))
      setSecretaries(forms.length > 0 ? forms : [emptySecretaryForm()])
      setSuccess(true)
    } catch (err) {
      console.error("[EntitySecretariesPage] Error saving:", err)
      setError("Error al guardar las secretarías")
    } finally {
      setSaving(false)
    }
  }

  const backHref = `/superadmin/organizations/${organizationId}`

  if (profileLoading || loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar profile={profile} />
      <main
        className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-8 ${isImpersonating ? "md:pt-[48px]" : ""}`}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => router.push(backHref)}>
              <ArrowLeft className="h-4 w-4" />
              Volver a organización
            </Button>
          </div>

          <PageHeader
            title="Secretarías"
            description={
              entity
                ? `Gestiona las secretarías de ${entity.name}`
                : "Gestiona las secretarías de la entidad"
            }
          />

          {(organization || entity) && (
            <Card>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{entity?.name || "Entidad"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {organization?.name ? `${organization.name} · ` : ""}
                      NIT: {entity?.nit || "—"}
                    </p>
                  </div>
                </div>
                {entity && (
                  <Badge variant={entity.status === "active" ? "default" : "secondary"}>
                    {entity.status === "active" ? "Activa" : "Inactiva"}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Listado de secretarías</CardTitle>
              <CardDescription>
                Agrega, edita o elimina secretarías. Los campos vacíos no se guardan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!entity ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error || "Entidad no encontrada"}
                </div>
              ) : (
                <>
                  <SecretariesEditor
                    secretaries={secretaries}
                    onChange={updateSecretaryField}
                    onAdd={addSecretaryField}
                    onRemove={removeSecretaryField}
                  />

                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                  )}
                  {success && (
                    <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                      Secretarías guardadas correctamente.
                    </div>
                  )}

                  <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => router.push(backHref)}
                    >
                      Cancelar
                    </Button>
                    <Button type="button" className="w-full sm:w-auto" onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Guardar secretarías
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
