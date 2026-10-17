"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, FileText, ImageIcon, Loader2, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createEntity, deleteEntity, getEntities, getOrganizations, updateEntity, type EntityMapped, type OrganizationMapped } from "@/lib/supabase/client-data-access"
import { logger } from "@/lib/logger"

const emptyForm = { name: "", nit: "", representativeName: "", status: "active" as "active" | "inactive", logoUrl: "" }

export function OrganizationEntitiesPage({ organizationId }: { organizationId: string }) {
  const router = useRouter()
  const [organization, setOrganization] = React.useState<OrganizationMapped | null>(null)
  const [entities, setEntities] = React.useState<EntityMapped[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [selectedEntity, setSelectedEntity] = React.useState<EntityMapped | null>(null)
  const [entityToDelete, setEntityToDelete] = React.useState<EntityMapped | null>(null)
  const [form, setForm] = React.useState(emptyForm)
  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [orgs, entityList] = await Promise.all([getOrganizations(), getEntities(organizationId)])
      setOrganization(orgs.find((org) => org.id === organizationId) || null)
      setEntities(entityList)
    } catch (err) {
      logger.error("/superadmin/organizations/[id]/entities", "Error loading entities", err)
    } finally { setLoading(false) }
  }, [organizationId])

  React.useEffect(() => {
    logger.pageView("/superadmin/organizations/[id]/entities", undefined, undefined, { organizationId })
    loadData()
  }, [loadData, organizationId])

  const resetForm = () => { setForm(emptyForm); setLogoFile(null); setLogoPreview(null); setError(null) }
  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"].includes(file.type)) return setError("Solo se permiten archivos de imagen (PNG, JPG, GIF, WEBP)")
    if (file.size > 5 * 1024 * 1024) return setError("El archivo no puede exceder 5MB")
    setLogoFile(file); setError(null)
    const reader = new FileReader()
    reader.onloadend = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }
  const uploadLogo = async (file: File, entityId?: string): Promise<string | null> => {
    try {
      setUploading(true)
      const body = new FormData(); body.append("file", file); if (entityId) body.append("entityId", entityId)
      const response = await fetch("/api/upload-logo", { method: "POST", body })
      if (!response.ok) { const data = await response.json(); throw new Error(data.message || "Error al subir el logo") }
      return (await response.json()).url
    } catch (err) { setError(err instanceof Error ? err.message : "Error al subir el logo"); return null } finally { setUploading(false) }
  }
  const handleAdd = async () => {
    if (!form.name || !form.nit) return setError("Nombre y NIT son requeridos")
    try {
      setSaving(true); setError(null)
      const logoUrl = logoFile ? await uploadLogo(logoFile) || "" : form.logoUrl
      await createEntity({ ...form, organizationId, logoUrl: logoUrl || undefined })
      await loadData(); setAddOpen(false); resetForm()
      logger.action("/superadmin/organizations/[id]/entities", "Add Entity", undefined, undefined, { organizationId, entity: form })
    } catch (err) { setError("Error al crear la entidad"); logger.error("/superadmin/organizations/[id]/entities", "Error adding entity", err) } finally { setSaving(false) }
  }
  const handleEdit = async () => {
    if (!selectedEntity || !form.name || !form.nit) return setError("Nombre y NIT son requeridos")
    try {
      setSaving(true); setError(null)
      const logoUrl = logoFile ? await uploadLogo(logoFile, selectedEntity.id) || selectedEntity.logoUrl || "" : form.logoUrl
      await updateEntity(selectedEntity.id, { ...form, logoUrl: logoUrl || undefined })
      await loadData(); setEditOpen(false); setSelectedEntity(null); resetForm()
      logger.action("/superadmin/organizations/[id]/entities", "Edit Entity", undefined, undefined, { organizationId, entity: form })
    } catch (err) { setError("Error al actualizar la entidad"); logger.error("/superadmin/organizations/[id]/entities", "Error editing entity", err) } finally { setSaving(false) }
  }
  const handleDelete = async () => {
    if (!entityToDelete) return
    try {
      setSaving(true); await deleteEntity(entityToDelete.id); await loadData(); setDeleteOpen(false); setEntityToDelete(null)
      logger.action("/superadmin/organizations/[id]/entities", "Delete Entity", undefined, undefined, { organizationId, entityId: entityToDelete.id })
    } catch (err) { logger.error("/superadmin/organizations/[id]/entities", "Error deleting entity", err) } finally { setSaving(false) }
  }
  const openEdit = (entity: EntityMapped) => {
    setSelectedEntity(entity); setForm({ name: entity.name, nit: entity.nit, representativeName: entity.representativeName, status: entity.status as "active" | "inactive", logoUrl: entity.logoUrl || "" }); setLogoPreview(entity.logoUrl || null); setLogoFile(null); setError(null); setEditOpen(true)
  }

  if (loading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!organization) return <div className="flex h-[50vh] flex-col items-center justify-center gap-4"><p className="text-muted-foreground">Organización no encontrada</p><Button variant="outline" onClick={() => router.push("/superadmin/organizations")}>Volver</Button></div>

  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:gap-6">
    <Button variant="ghost" size="sm" className="w-fit gap-1.5" onClick={() => router.push(`/superadmin/organizations/${organizationId}`)}><ArrowLeft className="h-4 w-4" />Volver a organización</Button>
    <PageHeader title="Entidades" description={`Gestiona las entidades de ${organization.name}`}><Button className="w-full sm:w-auto" onClick={() => { resetForm(); setAddOpen(true) }}><Plus className="mr-2 h-4 w-4" />Nueva entidad</Button></PageHeader>
    <Card><CardHeader><CardTitle>Entidades de la organización</CardTitle><CardDescription>Gestiona las entidades asociadas y sus secretarías</CardDescription></CardHeader><CardContent>
      {entities.length === 0 ? <div className="flex flex-col items-center py-8 text-center"><Building2 className="h-12 w-12 text-muted-foreground/50" /><p className="mt-4 text-muted-foreground">No hay entidades en esta organización</p><Button className="mt-4 w-full sm:w-auto" onClick={() => { resetForm(); setAddOpen(true) }}><Plus className="mr-2 h-4 w-4" />Crear primera entidad</Button></div>
      : <div className="grid gap-3 md:grid-cols-2">{entities.map((entity) => <div key={entity.id} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3">{entity.logoUrl ? <img src={entity.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>}<div className="min-w-0"><p className="truncate font-medium">{entity.name}</p><p className="text-sm text-muted-foreground">NIT: {entity.nit}</p>{entity.representativeName && <p className="truncate text-xs text-muted-foreground">{entity.representativeName}</p>}</div></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEdit(entity)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem><DropdownMenuItem onClick={() => router.push(`/superadmin/organizations/${organizationId}/entities/${entity.id}/secretaries`)}><FileText className="mr-2 h-4 w-4" />Gestionar secretarías</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => { setEntityToDelete(entity); setDeleteOpen(true) }}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><div className="mt-3 flex items-center justify-between gap-2"><Badge variant={entity.status === "active" ? "default" : "secondary"}>{entity.status === "active" ? "Activa" : "Inactiva"}</Badge><Button variant="secondary" size="sm" onClick={() => router.push(`/superadmin/organizations/${organizationId}/entities/${entity.id}/secretaries`)}><FileText className="mr-1.5 h-3.5 w-3.5" />Secretarías</Button></div></div>)}</div>}
    </CardContent></Card>
    <EntityDialog open={addOpen} onOpenChange={setAddOpen} title="Nueva entidad" submitLabel="Crear entidad" form={form} setForm={setForm} error={error} preview={logoPreview} onLogoChange={handleLogoFileChange} onRemoveLogo={() => { setLogoFile(null); setLogoPreview(null); setForm({ ...form, logoUrl: "" }) }} onSubmit={handleAdd} saving={saving || uploading} />
    <EntityDialog open={editOpen} onOpenChange={setEditOpen} title="Editar entidad" submitLabel="Guardar cambios" form={form} setForm={setForm} error={error} preview={logoPreview} onLogoChange={handleLogoFileChange} onRemoveLogo={() => { setLogoFile(null); setLogoPreview(null); setForm({ ...form, logoUrl: "" }) }} onSubmit={handleEdit} saving={saving || uploading} />
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><DialogContent><DialogHeader><DialogTitle>Eliminar entidad</DialogTitle><DialogDescription>¿Eliminar {entityToDelete?.name}? Esta acción eliminará sus procesos y documentos asociados.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</Button></DialogFooter></DialogContent></Dialog>
  </div>
}

function EntityDialog({ open, onOpenChange, title, submitLabel, form, setForm, error, preview, onLogoChange, onRemoveLogo, onSubmit, saving }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; submitLabel: string; form: typeof emptyForm; setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>; error: string | null; preview: string | null; onLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void; onRemoveLogo: () => void; onSubmit: () => void; saving: boolean }) {
  const id = title === "Nueva entidad" ? "new-entity-logo" : "edit-entity-logo"
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Completa la información de la entidad.</DialogDescription></DialogHeader>{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}<div className="space-y-4 py-2"><Field label="Nombre de la entidad" value={form.name} onChange={(name) => setForm({ ...form, name })} /><Field label="NIT" value={form.nit} onChange={(nit) => setForm({ ...form, nit })} /><Field label="Representante legal" value={form.representativeName} onChange={(representativeName) => setForm({ ...form, representativeName })} /><div className="space-y-2"><Label>Logo de la entidad (opcional)</Label>{preview ? <div className="relative inline-block"><img src={preview} alt="Vista previa del logo" className="h-20 rounded border object-contain" /><Button type="button" variant="ghost" size="icon" className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground" onClick={onRemoveLogo}><X className="h-4 w-4" /></Button></div> : <label htmlFor={id} className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed"><ImageIcon className="h-6 w-6 text-muted-foreground" /><span className="text-sm text-muted-foreground">Haz clic para subir logo</span><input id={id} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" className="hidden" onChange={onLogoChange} /></label>}</div><div className="space-y-2"><Label>Estado</Label><Select value={form.status} onValueChange={(status: "active" | "inactive") => setForm({ ...form, status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Activa</SelectItem><SelectItem value="inactive">Inactiva</SelectItem></SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={onSubmit} disabled={saving || !form.name.trim() || !form.nit.trim()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitLabel}</Button></DialogFooter></DialogContent></Dialog>
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} /></div> }
