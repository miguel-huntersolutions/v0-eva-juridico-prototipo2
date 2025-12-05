"use client"

import * as React from "react"
import {
  FileText,
  Plus,
  Search,
  Upload,
  Check,
  Info,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Download,
  X,
  Loader2,
  type File,
  FileDownIcon,
  FileUpIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import type { Template } from "@/lib/mock-data"
import type { ProcessType } from "@/lib/mock-data"
import { getTemplates, createTemplate, deleteTemplate, getProcessTypes } from "@/lib/supabase/client-data-access"

interface UploadedFile {
  name: string
  size: number
  type: string
  lastModified?: number // Keep for potential future use, though not strictly needed for the current updates
}

export function TemplatesPage() {
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [processTypes, setProcessTypes] = React.useState<ProcessType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = React.useState(true)
  const [isLoadingTemplates, setIsLoadingTemplates] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  // Renamed filterProcessType to processTypeFilter for consistency
  const [filterProcessType, setFilterProcessType] = React.useState<string>("all")
  const [createStep, setCreateStep] = React.useState(1)
  const [templateName, setTemplateName] = React.useState("")
  const [templateDescription, setTemplateDescription] = React.useState("")
  const [selectedProcessTypeId, setSelectedProcessTypeId] = React.useState("")
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile | null>(null)
  // Renamed isDragging to isDragActive for consistency
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  // Added saving and deleting states
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingTypes(true)
        setIsLoadingTemplates(true)
        setLoadError(null)

        const [typesData, templatesData] = await Promise.all([getProcessTypes(), getTemplates()])

        setProcessTypes(
          typesData.map((pt) => ({
            id: pt.id,
            name: pt.name,
            description: pt.description || "",
          })),
        )
        setTemplates(templatesData)
      } catch (err) {
        console.error("Error loading data:", err)
        setLoadError("Error al cargar los datos. Por favor, intente de nuevo.")
      } finally {
        setIsLoadingTypes(false)
        setIsLoadingTemplates(false)
      }
    }

    loadData()
  }, [])

  const getProcessType = (processTypeId: string): ProcessType | undefined => {
    return processTypes.find((pt) => pt.id === processTypeId)
  }

  // Added getProcessTypeName for consistency with the update
  const getProcessTypeName = (processTypeId: string): string => {
    const pt = processTypes.find((p) => p.id === processTypeId)
    return pt?.name || "Sin tipo"
  }

  // Modified filteredTemplates logic slightly
  const filteredTemplates = React.useMemo(() => {
    let result = [...templates]

    if (filterProcessType !== "all") {
      result = result.filter((t) => t.processTypeId === filterProcessType)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((t) => t.name.toLowerCase().includes(query) || t.fileUrl.toLowerCase().includes(query))
    }

    return result
  }, [templates, filterProcessType, searchQuery])

  // Added templatesByType memo (though not used in the final merged code)
  const templatesByType = React.useMemo(() => {
    const grouped: Record<string, Template[]> = {}
    templates.forEach((template) => {
      if (!grouped[template.processTypeId]) {
        grouped[template.processTypeId] = []
      }
      grouped[template.processTypeId].push(template)
    })
    return grouped
  }, [templates])

  // Added handleEdit and handleView for the new dialogs
  const handleEdit = (template: Template) => {
    setSelectedTemplate(template)
    setIsEditOpen(true)
  }

  const handleView = (template: Template) => {
    setSelectedTemplate(template)
    setIsDetailOpen(true)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setFilterProcessType("all")
  }

  const hasActiveFilters = searchQuery || filterProcessType !== "all"

  const resetCreateDialog = () => {
    setCreateStep(1)
    setTemplateName("")
    setTemplateDescription("")
    setSelectedProcessTypeId("")
    setUploadedFile(null)
    setIsDragging(false)
    setIsUploading(false)
  }

  const handleOpenCreate = () => {
    resetCreateDialog()
    setIsCreateOpen(true)
  }

  const handleCloseCreate = () => {
    setIsCreateOpen(false)
    resetCreateDialog()
  }

  const handleFileSelect = (file: File) => {
    if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      setIsUploading(true)
      // Simulate upload delay
      setTimeout(() => {
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        })
        setIsUploading(false)
      }, 1500)
    } else {
      alert("Solo se permiten archivos .docx")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    // Renamed state variable
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Renamed state variable
    setIsDragging(false)
  }

  // Renamed and adjusted handleDrop logic
  const handleDropNew = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })
    }
  }

  // Renamed and adjusted handleFileChange logic
  const handleFileChangeNew = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })
    }
  }

  const handleDownloadExample = () => {
    // Create a mock .docx download (in real app this would download actual file)
    const content = `
PLANTILLA DE EJEMPLO - EVA JURÍDICO
=====================================

Este documento sirve como ejemplo de estructura para plantillas de documentos jurídicos.

VARIABLES DISPONIBLES:
- {{ENTIDAD_NOMBRE}}: Nombre de la entidad contratante
- {{ENTIDAD_NIT}}: NIT de la entidad
- {{REPRESENTANTE_LEGAL}}: Nombre del representante legal
- {{OBJETO_CONTRATO}}: Objeto del contrato
- {{VALOR_CONTRATO}}: Valor total del contrato
- {{PLAZO_EJECUCION}}: Plazo de ejecución
- {{FECHA_ELABORACION}}: Fecha de elaboración del documento
- {{SECRETARIA_NOMBRE}}: Nombre de la secretaría supervisora

SECCIONES SUGERIDAS:
1. IDENTIFICACIÓN
2. JUSTIFICACIÓN DE LA NECESIDAD
3. OBJETO DEL CONTRATO
4. ESPECIFICACIONES TÉCNICAS
5. ANÁLISIS DEL SECTOR
6. PRESUPUESTO Y CERTIFICACIÓN
7. CRITERIOS DE SELECCIÓN
8. ANÁLISIS DE RIESGOS
9. GARANTÍAS
10. SUPERVISIÓN

=====================================
© EVA Jurídico - Plantilla de Ejemplo
    `.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "plantilla-ejemplo-eva-juridico.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const canProceedStep1 = templateName.trim() !== "" && selectedProcessTypeId !== ""
  const canProceedStep2 = uploadedFile !== null
  const selectedProcessType = processTypes.find((pt) => pt.id === selectedProcessTypeId)

  const handleCreateTemplate = async () => {
    if (!templateName || !selectedProcessTypeId || !uploadedFile) return

    try {
      setIsSaving(true)

      // In a real application, you would upload the file to storage here and get its URL.
      // For this example, we'll simulate a file URL.
      const fileUrl = `/templates/${uploadedFile.name}`

      const newTemplate = await createTemplate({
        name: templateName,
        processTypeId: selectedProcessTypeId,
        fileUrl: fileUrl, // This would be the actual URL from storage
        description: templateDescription,
      })

      setTemplates([...templates, newTemplate])
      handleCloseCreate()
    } catch (err) {
      console.error("Error creating template:", err)
      alert("Error al crear la plantilla. Por favor, intente de nuevo.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!deleteId) return

    try {
      setIsDeleting(true)
      await deleteTemplate(deleteId)
      setTemplates(templates.filter((t) => t.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      console.error("Error deleting template:", err)
      alert("Error al eliminar la plantilla. Por favor, intente de nuevo.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoadingTypes || isLoadingTemplates) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Cargando plantillas...</span>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-destructive">{loadError}</p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plantillas de Documentos</h1>
          <p className="text-muted-foreground">Gestiona las plantillas para cada tipo de proceso contractual</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar plantillas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterProcessType} onValueChange={setFilterProcessType}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filtrar por tipo de proceso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos de proceso</SelectItem>
                {processTypes.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="group relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-tight">{template.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {getProcessTypeName(template.processTypeId)}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTemplate(template)
                        setIsDetailOpen(true)
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTemplate(template)
                        setIsEditOpen(true)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(template.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Creada: {template.createdAt}</span>
                <span className="font-mono text-xs">.docx</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No hay plantillas</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {searchQuery || filterProcessType !== "all"
                ? "No se encontraron plantillas con los filtros aplicados."
                : "Comienza creando tu primera plantilla de documento."}
            </p>
            {!searchQuery && filterProcessType === "all" && (
              <Button className="mt-4" onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Plantilla
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La plantilla será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Nueva Plantilla de Documento</DialogTitle>
            <DialogDescription>
              Crea una plantilla que será utilizada para generar documentos automáticamente
            </DialogDescription>
          </DialogHeader>

          {/* Steps Indicator */}
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    createStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {createStep > step ? <Check className="h-4 w-4" /> : step}
                </div>
                {step < 3 && (
                  <div className={`h-1 w-12 rounded-full ${createStep > step ? "bg-primary" : "bg-muted"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <Separator />

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto py-4">
            {/* Step 1: Basic Info */}
            {createStep === 1 && (
              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="tpl-name">Nombre de la Plantilla *</Label>
                  <Input
                    id="tpl-name"
                    placeholder="Ej: Estudios Previos - Contratación Directa"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa un nombre descriptivo que identifique el tipo de documento
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tpl-process-type">Tipo de Proceso *</Label>
                  <Select value={selectedProcessTypeId} onValueChange={setSelectedProcessTypeId}>
                    <SelectTrigger id="tpl-process-type">
                      <SelectValue placeholder="Seleccionar tipo de proceso..." />
                    </SelectTrigger>
                    <SelectContent>
                      {processTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    La plantilla se usará para generar documentos de este tipo de proceso
                  </p>
                </div>

                {selectedProcessType && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>{selectedProcessType.name}</AlertTitle>
                    <AlertDescription className="text-sm">{selectedProcessType.description}</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="tpl-description">Descripción (Opcional)</Label>
                  <Textarea
                    id="tpl-description"
                    placeholder="Describe el propósito y contenido de esta plantilla..."
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: File Upload */}
            {createStep === 2 && (
              <div className="space-y-6">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileDownIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Archivo de Ejemplo</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Descarga nuestra plantilla de ejemplo para ver el formato correcto con las variables
                        disponibles.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 bg-transparent"
                        onClick={handleDownloadExample}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Ejemplo
                      </Button>
                    </div>
                  </div>
                </div>

                <div
                  className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : uploadedFile
                        ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropNew} // Use the renamed drop handler
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Subiendo archivo...</p>
                    </div>
                  ) : uploadedFile ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <Check className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation() // Prevent trigger from file input
                          setUploadedFile(null)
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Eliminar y subir otro
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <FileUpIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Arrastra tu archivo aquí</p>
                        <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
                      </div>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Seleccionar Archivo
                      </Button>
                      <p className="text-xs text-muted-foreground">Solo archivos .docx (máx. 10MB)</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileChangeNew} // Use the renamed file change handler
                  />
                </div>
              </div>
            )}

            {/* Step 3: Preview & Confirm */}
            {createStep === 3 && (
              <div className="space-y-6">
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertTitle>Todo listo</AlertTitle>
                  <AlertDescription>Revisa los detalles de la plantilla antes de crearla.</AlertDescription>
                </Alert>

                <div className="rounded-lg border p-4 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-medium">{templateName}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Proceso</p>
                    <p className="font-medium">{selectedProcessType?.name}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Archivo</p>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <p className="font-medium">{uploadedFile?.name}</p>
                      <Badge variant="secondary">{uploadedFile ? formatFileSize(uploadedFile.size) : ""}</Badge>
                    </div>
                  </div>
                  {templateDescription && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Descripción</p>
                        <p className="font-medium">{templateDescription}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Footer */}
          <DialogFooter className="flex-shrink-0 pt-4">
            <div className="flex w-full items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  if (createStep === 1) {
                    handleCloseCreate()
                  } else {
                    setCreateStep(createStep - 1)
                  }
                }}
                disabled={isSaving}
              >
                {createStep === 1 ? "Cancelar" : "Anterior"}
              </Button>

              {createStep < 3 ? (
                <Button
                  onClick={() => setCreateStep(createStep + 1)}
                  disabled={(createStep === 1 && !canProceedStep1) || (createStep === 2 && !canProceedStep2)}
                >
                  Siguiente
                </Button>
              ) : (
                <Button onClick={handleCreateTemplate} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Plantilla
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles de Plantilla</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedTemplate.name}</h3>
                  <Badge variant="secondary">{getProcessTypeName(selectedTemplate.processTypeId)}</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Archivo</p>
                  <p className="font-mono text-sm">{selectedTemplate.fileUrl}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                  <p>{selectedTemplate.createdAt}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Plantilla</DialogTitle>
            <DialogDescription>Modifica los datos de la plantilla seleccionada.</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-template-name">Nombre de la Plantilla *</Label>
                <Input id="edit-template-name" defaultValue={selectedTemplate.name} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-process-type">Tipo de Proceso *</Label>
                <Select defaultValue={selectedTemplate.processTypeId}>
                  <SelectTrigger id="edit-process-type">
                    <SelectValue placeholder="Selecciona un tipo de proceso" />
                  </SelectTrigger>
                  <SelectContent>
                    {processTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Archivo Actual</Label>
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <FileText className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedTemplate.fileUrl}</p>
                    <p className="text-xs text-muted-foreground">
                      Creado: {new Date(selectedTemplate.createdAt).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Reemplazar
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsEditOpen(false)}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
