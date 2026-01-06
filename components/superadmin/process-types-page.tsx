"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  FolderKanban,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  FileStack,
  X,
  Info,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink,
  Calendar,
  File,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatsCard } from "@/components/stats-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  getProcessTypes,
  getTemplates,
  createProcessType,
  updateProcessType,
  deleteProcessType,
  updateTemplate,
} from "@/lib/supabase/client-data-access"
import type { ProcessType, Template } from "@/lib/supabase/client-data-access"

export function ProcessTypesPage() {
  const router = useRouter()
  const [processTypes, setProcessTypes] = React.useState<ProcessType[]>([])
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isViewTemplatesOpen, setIsViewTemplatesOpen] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [selectedType, setSelectedType] = React.useState<ProcessType | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [expandedTypes, setExpandedTypes] = React.useState<Set<string>>(new Set())
  const [isTemplateDetailOpen, setIsTemplateDetailOpen] = React.useState(false)
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null)
  const [isAssociateTemplatesOpen, setIsAssociateTemplatesOpen] = React.useState(false)
  const [selectedTemplatesToAssociate, setSelectedTemplatesToAssociate] = React.useState<Set<string>>(new Set())
  const [isAssociating, setIsAssociating] = React.useState(false)

  const [formData, setFormData] = React.useState({ name: "", description: "" })
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setIsLoading(true)
      setError(null)
      const [typesData, templatesData] = await Promise.all([getProcessTypes(), getTemplates()])
      setProcessTypes(typesData)
      setTemplates(templatesData)
    } catch (err) {
      console.error("Error loading data:", err)
      setError("Error al cargar los tipos de proceso")
    } finally {
      setIsLoading(false)
    }
  }

  // State to track template-process type relationships
  const [templateProcessTypeMap, setTemplateProcessTypeMap] = React.useState<Map<string, Set<string>>>(new Map())

  // Load template-process type relationships
  React.useEffect(() => {
    const loadTemplateRelations = async () => {
      try {
        const { createBrowserClient } = await import("@/lib/supabase/client")
        const supabase = createBrowserClient()
        const { data, error } = await supabase.from("template_process_types").select("template_id, process_type_id")

        if (error) {
          console.error("Error loading template relations:", error)
          return
        }

        // Build a map: templateId -> Set of processTypeIds
        const map = new Map<string, Set<string>>()
        data?.forEach((row) => {
          if (!map.has(row.template_id)) {
            map.set(row.template_id, new Set())
          }
          map.get(row.template_id)?.add(row.process_type_id)
        })

        setTemplateProcessTypeMap(map)
      } catch (err) {
        console.error("Error loading template relations:", err)
      }
    }

    loadTemplateRelations()
  }, [templates]) // Reload when templates change

  const getTemplatesForType = (processTypeId: string): Template[] => {
    // Get templates associated with this process type using the many-to-many relationship
    return templates.filter((t) => {
      // Check if template is associated via the relation table
      const associatedTypes = templateProcessTypeMap.get(t.id)
      if (associatedTypes && associatedTypes.has(processTypeId)) {
        return true
      }
      // Fallback to primary process_type_id for backward compatibility
      return t.processTypeId === processTypeId
    })
  }

  const getTemplatesFromOtherTypes = (processTypeId: string): Template[] => {
    // Get all templates that are NOT associated with this process type
    return templates.filter((t) => {
      const associatedTypes = templateProcessTypeMap.get(t.id)
      // If template has relations, check if it's associated with this process type
      if (associatedTypes) {
        return !associatedTypes.has(processTypeId)
      }
      // Fallback to primary process_type_id
      return t.processTypeId !== processTypeId
    })
  }

  const handleToggleTemplateSelection = (templateId: string) => {
    setSelectedTemplatesToAssociate((prev) => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      return next
    })
  }

  const handleAssociateTemplates = async () => {
    if (!selectedType || selectedTemplatesToAssociate.size === 0) return

    try {
      setIsAssociating(true)
      // Associate each selected template with the current process type
      // This uses the many-to-many relationship, so templates can be associated with multiple process types
      const { associateTemplateWithProcessType } = await import("@/lib/supabase/client-data-access")
      const associatePromises = Array.from(selectedTemplatesToAssociate).map((templateId) =>
        associateTemplateWithProcessType(templateId, selectedType.id)
      )

      await Promise.all(associatePromises)

      // Reload templates to reflect the changes
      const updatedTemplates = await getTemplates()
      setTemplates(updatedTemplates)

      // Clear selection and close dialogs
      setSelectedTemplatesToAssociate(new Set())
      setIsAssociateTemplatesOpen(false)
      setIsViewTemplatesOpen(false)
    } catch (err) {
      console.error("Error associating templates:", err)
      setError("Error al asociar las plantillas. Por favor, intente de nuevo.")
    } finally {
      setIsAssociating(false)
    }
  }

  /**
   * Gets the Google Drive URL for a template file
   * Handles different formats: fileId:xxx|path:yyy, direct URL, or path
   */
  const getTemplateDriveUrl = (fileUrl: string): string | null => {
    if (!fileUrl) return null

    // If it's already a full Google Drive URL, return it
    if (fileUrl.startsWith("https://drive.google.com")) {
      return fileUrl
    }

    // If it's in format "fileId:xxx|path:yyy", extract the fileId
    if (fileUrl.startsWith("fileId:")) {
      const fileIdMatch = fileUrl.match(/fileId:([^|]+)/)
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/view`
      }
    }

    // If it's just a path, we can't construct a direct link without the fileId
    // Return null to indicate we can't open it
    return null
  }

  /**
   * Extracts the filename from a fileUrl (path or full URL)
   * Returns only the part after the last /
   */
  const getFileNameFromUrl = (fileUrl: string): string => {
    if (!fileUrl) return ""

    // If it's in format "fileId:xxx|path:yyy", extract the path part
    if (fileUrl.includes("|path:")) {
      const pathMatch = fileUrl.match(/\|path:(.+)/)
      if (pathMatch && pathMatch[1]) {
        const path = pathMatch[1]
        const fileName = path.split("/").pop() || path
        return fileName
      }
    }

    // If it's a regular path or URL, get the part after the last /
    const fileName = fileUrl.split("/").pop() || fileUrl
    
    // If it's a Google Drive URL, try to get a meaningful name
    // Otherwise, return the extracted filename
    return fileName
  }

  const handleEdit = (type: ProcessType) => {
    setSelectedType(type)
    setFormData({ name: type.name, description: type.description || "" })
    setIsEditOpen(true)
  }

  const handleViewTemplates = (type: ProcessType) => {
    setSelectedType(type)
    setIsViewTemplatesOpen(true)
  }

  const handleViewTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setIsTemplateDetailOpen(true)
  }

  const handleDelete = (type: ProcessType) => {
    setSelectedType(type)
    setIsDeleteOpen(true)
  }

  const toggleExpanded = (typeId: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(typeId)) {
        next.delete(typeId)
      } else {
        next.add(typeId)
      }
      return next
    })
  }

  async function handleCreate() {
    if (!formData.name.trim() || !formData.description.trim()) return

    try {
      setIsSaving(true)
      const newType = await createProcessType({
        name: formData.name.trim(),
        description: formData.description.trim(),
      })
      setProcessTypes((prev) => [...prev, newType])
      setIsCreateOpen(false)
      setFormData({ name: "", description: "" })
    } catch (err) {
      console.error("Error creating process type:", err)
      setError("Error al crear el tipo de proceso")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdate() {
    if (!selectedType || !formData.name.trim() || !formData.description.trim()) return

    try {
      setIsSaving(true)
      const updatedType = await updateProcessType(selectedType.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
      })
      setProcessTypes((prev) => prev.map((pt) => (pt.id === updatedType.id ? updatedType : pt)))
      setIsEditOpen(false)
      setSelectedType(null)
      setFormData({ name: "", description: "" })
    } catch (err) {
      console.error("Error updating process type:", err)
      setError("Error al actualizar el tipo de proceso")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!selectedType) return

    try {
      setIsDeleting(true)
      await deleteProcessType(selectedType.id)
      setProcessTypes((prev) => prev.filter((pt) => pt.id !== selectedType.id))
      setIsDeleteOpen(false)
      setSelectedType(null)
    } catch (err) {
      console.error("Error deleting process type:", err)
      setError("Error al eliminar el tipo de proceso. Puede que tenga plantillas o procesos asociados.")
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredTypes = React.useMemo(() => {
    if (!searchQuery) return processTypes
    const query = searchQuery.toLowerCase()
    return processTypes.filter(
      (pt) => pt.name.toLowerCase().includes(query) || (pt.description || "").toLowerCase().includes(query),
    )
  }, [processTypes, searchQuery])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <PageHeader
          title="Tipos de Proceso"
          description="Configura los tipos de contratación disponibles para todas las organizaciones"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        title="Tipos de Proceso"
        description="Configura los tipos de contratación disponibles para todas las organizaciones"
      >
        <Button
          onClick={() => {
            setFormData({ name: "", description: "" })
            setIsCreateOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Tipo
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatsCard
          title="Total Tipos"
          value={processTypes.length}
          description="Tipos de proceso configurados"
          icon={FolderKanban}
        />
        <StatsCard
          title="Con Plantillas"
          value={filteredTypes.filter((pt) => getTemplatesForType(pt.id).length > 0).length}
          description="Tipos con plantillas asociadas"
          icon={CheckCircle2}
        />
        <StatsCard
          title="Sin Plantillas"
          value={filteredTypes.filter((pt) => getTemplatesForType(pt.id).length === 0).length}
          description="Pendientes de configurar"
          icon={Info}
        />
        <StatsCard
          title="Total Plantillas"
          value={templates.length}
          description="Plantillas en el sistema"
          icon={FileStack}
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Tipos de Proceso</CardTitle>
              <CardDescription>
                Define los tipos de contratación según la Ley 80 y normativa vigente. Cada tipo puede tener múltiples
                plantillas asociadas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tipo de proceso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Process Types List */}
          {filteredTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No se encontraron tipos de proceso</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery ? "Intenta con otros términos de búsqueda" : "Crea un nuevo tipo de proceso para comenzar"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTypes.map((type) => {
                const typeTemplates = getTemplatesForType(type.id)
                const isExpanded = expandedTypes.has(type.id)

                return (
                  <Collapsible key={type.id} open={isExpanded} onOpenChange={() => toggleExpanded(type.id)}>
                    <div className="rounded-lg border transition-all hover:border-primary/50">
                      {/* Main row */}
                      <div className="group flex items-center justify-between p-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <FolderKanban className="h-5 w-5 text-primary" />
                          </div>
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{type.name}</h3>
                              {typeTemplates.length > 0 ? (
                                <Badge variant="secondary" className="text-xs">
                                  <FileStack className="mr-1 h-3 w-3" />
                                  {typeTemplates.length} plantilla{typeTemplates.length !== 1 ? "s" : ""}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Sin plantillas
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground max-w-xl">{type.description}</p>
                            {/* Plantillas asociadas - siempre visible */}
                            {typeTemplates.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap mt-2">
                                <span className="text-xs font-medium text-muted-foreground">Plantillas asociadas:</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {typeTemplates.slice(0, 3).map((template) => (
                                    <Badge key={template.id} variant="outline" className="text-xs font-normal">
                                      <FileText className="mr-1 h-3 w-3" />
                                      {template.name}
                                    </Badge>
                                  ))}
                                  {typeTemplates.length > 3 && (
                                    <Badge variant="outline" className="text-xs font-normal">
                                      +{typeTemplates.length - 3} más
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {typeTemplates.length > 0 && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-1">
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4" />
                                    Ocultar
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4" />
                                    Ver todas
                                  </>
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(type)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewTemplates(type)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Plantillas ({typeTemplates.length})
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(type)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <div className="border-t bg-muted/30 px-4 py-3">
                          <div className="ml-14 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                              Plantillas Asociadas
                            </p>
                            {typeTemplates.map((template) => (
                              <div
                                key={template.id}
                                className="flex items-center justify-between rounded-md border bg-background p-3 transition-colors hover:bg-accent/50"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{template.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Creada: {new Date(template.createdAt).toLocaleDateString("es-CO")}
                                    </p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleViewTemplate(template)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Tipo de Proceso</DialogTitle>
            <DialogDescription>
              Define un nuevo tipo de contratación. Este estará disponible para todas las organizaciones. Las plantillas
              se asocian desde la sección de Plantillas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type-name">Nombre *</Label>
              <Input
                id="type-name"
                placeholder="Ej: Contratación Directa"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type-desc">Descripción *</Label>
              <Textarea
                id="type-desc"
                placeholder="Describe el tipo de proceso y su base legal..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-500">Sobre las Plantillas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Después de crear el tipo de proceso, podrás asociar múltiples plantillas desde la sección
                    "Plantillas Maestras". Cada plantilla pertenece a un único tipo de proceso.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSaving || !formData.name.trim() || !formData.description.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Tipo de Proceso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Tipo de Proceso</DialogTitle>
            <DialogDescription>Modifica los datos del tipo de proceso seleccionado.</DialogDescription>
          </DialogHeader>
          {selectedType && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-type-name">Nombre *</Label>
                <Input
                  id="edit-type-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-type-desc">Descripción *</Label>
                <Textarea
                  id="edit-type-desc"
                  value={formData.description}
                  rows={3}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileStack className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Plantillas Asociadas</span>
                  </div>
                  <Badge variant="secondary">{getTemplatesForType(selectedType.id).length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Las plantillas se gestionan desde la sección "Plantillas Maestras"
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving || !formData.name.trim() || !formData.description.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de proceso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el tipo de proceso "{selectedType?.name}".
              Asegúrate de que no tenga plantillas o procesos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Templates Dialog */}
      <Dialog open={isViewTemplatesOpen} onOpenChange={setIsViewTemplatesOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              Plantillas de {selectedType?.name}
            </DialogTitle>
            <DialogDescription>
              Plantillas asociadas a este tipo de proceso. Para agregar nuevas plantillas, ve a "Plantillas Maestras".
            </DialogDescription>
          </DialogHeader>
          {selectedType && (
            <div className="py-4">
              {getTemplatesForType(selectedType.id).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileStack className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium">Sin plantillas asociadas</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Este tipo de proceso no tiene plantillas configuradas
                  </p>
                  <Button
                    variant="default"
                    className="mt-4"
                    onClick={() => {
                      setIsViewTemplatesOpen(false)
                      router.push(`/superadmin/templates?processTypeId=${selectedType.id}`)
                    }}
                  >
                    <FileStack className="mr-2 h-4 w-4" />
                    Ir a Plantillas Maestras
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {getTemplatesForType(selectedType.id).map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{getFileNameFromUrl(template.fileUrl)}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(template.createdAt).toLocaleDateString("es-CO")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewTemplate(template)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplatesToAssociate(new Set())
                  setIsAssociateTemplatesOpen(true)
                }}
              >
                <FileStack className="mr-2 h-4 w-4" />
                Asociar Plantillas Existentes
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  setIsViewTemplatesOpen(false)
                  if (selectedType) {
                    router.push(`/superadmin/templates?processTypeId=${selectedType.id}`)
                  }
                }}
              >
                <FileStack className="mr-2 h-4 w-4" />
                Crear Nueva Plantilla
              </Button>
            </div>
            <Button variant="outline" onClick={() => setIsViewTemplatesOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Detail Dialog */}
      <Dialog open={isTemplateDetailOpen} onOpenChange={setIsTemplateDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-500/10">
                <FileText className="h-7 w-7 text-blue-500" />
              </div>
              <div>
                <DialogTitle>{selectedTemplate?.name}</DialogTitle>
                <DialogDescription>Detalles de la plantilla</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedTemplate && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-medium">Fecha de Creación</span>
                  </div>
                  <p className="text-sm font-medium">
                    {new Date(selectedTemplate.createdAt).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <File className="h-4 w-4" />
                    <span className="text-xs font-medium">Archivo</span>
                  </div>
                  <p className="text-sm font-medium">{getFileNameFromUrl(selectedTemplate.fileUrl)}</p>
                </div>
              </div>
              <div className="flex justify-center gap-4 pt-4">
                {(() => {
                  const driveUrl = getTemplateDriveUrl(selectedTemplate.fileUrl)
                  if (driveUrl) {
                    return (
                      <Button
                        onClick={() => window.open(driveUrl, "_blank", "noopener,noreferrer")}
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir en Google Drive
                      </Button>
                    )
                  }
                  return (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        No se puede abrir el archivo. El enlace no está disponible.
                      </p>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Associate Templates Dialog */}
      <Dialog open={isAssociateTemplatesOpen} onOpenChange={setIsAssociateTemplatesOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileStack className="h-5 w-5 text-primary" />
              Asociar Plantillas Existentes a {selectedType?.name}
            </DialogTitle>
            <DialogDescription>
              Selecciona plantillas de otros tipos de proceso para asociarlas a este tipo. Las plantillas seleccionadas se moverán a este tipo de proceso.
            </DialogDescription>
          </DialogHeader>
          {selectedType && (
            <div className="py-4">
              {(() => {
                const otherTemplates = getTemplatesFromOtherTypes(selectedType.id)
                if (otherTemplates.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileStack className="mb-4 h-12 w-12 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium">No hay plantillas disponibles</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Todas las plantillas ya están asociadas a este tipo de proceso o no hay plantillas en el sistema
                      </p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {otherTemplates.map((template) => {
                      const isSelected = selectedTemplatesToAssociate.has(template.id)
                      const templateProcessType = processTypes.find((pt) => pt.id === template.processTypeId)

                      return (
                        <div
                          key={template.id}
                          className={`flex items-center justify-between rounded-lg border p-4 transition-colors cursor-pointer ${
                            isSelected ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                          }`}
                          onClick={() => handleToggleTemplateSelection(template.id)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-md border-2 transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/30"
                              }`}
                            >
                              {isSelected ? <Check className="h-4 w-4" /> : null}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{template.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {templateProcessType?.name || "Tipo desconocido"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{getFileNameFromUrl(template.fileUrl)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssociateTemplatesOpen(false)} disabled={isAssociating}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssociateTemplates}
              disabled={isAssociating || selectedTemplatesToAssociate.size === 0}
            >
              {isAssociating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Asociar {selectedTemplatesToAssociate.size > 0 ? `(${selectedTemplatesToAssociate.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
