"use client"

import * as React from "react"
import {
  FileStack,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
  Eye,
  X,
  Calendar,
  FolderKanban,
  FileText,
  File,
  CheckCircle2,
  Sparkles,
  FileDown,
  FileUp,
  Info,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { mockTemplates, mockProcessTypes, type Template, type ProcessType } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface UploadedFile {
  name: string
  size: number
  type: string
  lastModified: number
}

export function TemplatesPage() {
  const [templates, setTemplates] = React.useState(mockTemplates)
  const [processTypes] = React.useState(mockProcessTypes)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterProcessType, setFilterProcessType] = React.useState<string>("all")

  const [createStep, setCreateStep] = React.useState(1)
  const [templateName, setTemplateName] = React.useState("")
  const [templateDescription, setTemplateDescription] = React.useState("")
  const [selectedProcessTypeId, setSelectedProcessTypeId] = React.useState("")
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const getProcessType = (processTypeId: string): ProcessType | undefined => {
    return processTypes.find((pt) => pt.id === processTypeId)
  }

  const filteredTemplates = React.useMemo(() => {
    let result = [...templates]

    if (filterProcessType !== "all") {
      result = result.filter((t) => t.processTypeId === filterProcessType)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((t) => t.name.toLowerCase().includes(query))
    }

    return result
  }, [templates, filterProcessType, searchQuery])

  const handleViewDetails = (template: Template) => {
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
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const canProceedStep1 = templateName.trim() && selectedProcessTypeId
  const canProceedStep2 = uploadedFile !== null
  const selectedProcessType = processTypes.find((pt) => pt.id === selectedProcessTypeId)

  const handleCreateTemplate = () => {
    if (!templateName || !selectedProcessTypeId || !uploadedFile) return

    const newTemplate: Template = {
      id: `tpl-${Date.now()}`,
      name: templateName,
      processTypeId: selectedProcessTypeId,
      fileUrl: `/templates/${uploadedFile.name}`,
      createdAt: new Date().toISOString().split("T")[0],
    }

    setTemplates([...templates, newTemplate])
    handleCloseCreate()
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        title="Plantillas Maestras"
        description="Gestiona las plantillas de documentos utilizadas en la generación"
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Plantillas"
          value={templates.length}
          description="Plantillas configuradas"
          icon={FileStack}
        />
        <StatsCard
          title="Tipos Cubiertos"
          value={new Set(templates.map((t) => t.processTypeId)).size}
          description={`de ${processTypes.length} tipos de proceso`}
          icon={FolderKanban}
        />
        <StatsCard
          title="Última Actualización"
          value="Hoy"
          description="Plantillas recientemente modificadas"
          icon={Calendar}
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Plantillas de Documentos</CardTitle>
          <CardDescription>
            Las plantillas definen la estructura de los documentos generados para cada tipo de proceso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar plantilla..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterProcessType} onValueChange={setFilterProcessType}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {processTypes.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Templates Table */}
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileStack className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No se encontraron plantillas</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "Crea una nueva plantilla para comenzar"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4 bg-transparent" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plantilla</TableHead>
                    <TableHead>Tipo de Proceso</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => {
                    const processType = getProcessType(template.processTypeId)
                    return (
                      <TableRow
                        key={template.id}
                        className="group cursor-pointer"
                        onClick={() => handleViewDetails(template)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                              <FileText className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-medium">{template.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[300px]">{template.fileUrl}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {processType && (
                            <Badge variant="secondary">
                              <FolderKanban className="mr-1 h-3 w-3" />
                              {processType.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(template.createdAt).toLocaleDateString("es-CO")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewDetails(template)
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                <Upload className="mr-2 h-4 w-4" />
                                Reemplazar archivo
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && handleCloseCreate()}>
        <DialogContent className="sm:max-w-2xl h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileStack className="h-5 w-5 text-primary" />
              Nueva Plantilla
            </DialogTitle>
            <DialogDescription>
              Configura y sube una plantilla de documento para generar documentos jurídicos automáticamente.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex-shrink-0 py-4">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                      createStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {createStep > step ? <CheckCircle2 className="h-4 w-4" /> : step}
                  </div>
                  {step < 3 && (
                    <div
                      className={cn("h-0.5 w-12 transition-colors", createStep > step ? "bg-primary" : "bg-muted")}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-2 flex justify-center">
              <p className="text-sm text-muted-foreground">
                {createStep === 1 && "Información básica"}
                {createStep === 2 && "Cargar archivo"}
                {createStep === 3 && "Confirmación"}
              </p>
            </div>
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
                {/* Download Example Section */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileDown className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Archivo de Ejemplo</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Descarga nuestra plantilla de ejemplo para ver la estructura recomendada y las variables
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

                {/* Variables Info */}
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Variables Disponibles
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground mb-3">
                    Usa estas variables en tu documento y serán reemplazadas automáticamente:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      "{{ENTIDAD_NOMBRE}}",
                      "{{ENTIDAD_NIT}}",
                      "{{REPRESENTANTE_LEGAL}}",
                      "{{OBJETO_CONTRATO}}",
                      "{{VALOR_CONTRATO}}",
                      "{{PLAZO_EJECUCION}}",
                      "{{FECHA_ELABORACION}}",
                      "{{SECRETARIA_NOMBRE}}",
                    ].map((variable) => (
                      <code key={variable} className="rounded bg-muted px-2 py-1 font-mono text-xs">
                        {variable}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Upload Zone */}
                <div className="grid gap-2">
                  <Label>Archivo de Plantilla *</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />

                  {!uploadedFile ? (
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25 hover:border-muted-foreground/50",
                        isUploading && "pointer-events-none opacity-50",
                      )}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <>
                          <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <p className="text-sm font-medium">Cargando archivo...</p>
                        </>
                      ) : (
                        <>
                          <FileUp
                            className={cn("mb-3 h-10 w-10", isDragging ? "text-primary" : "text-muted-foreground")}
                          />
                          <p className="mb-1 text-sm font-medium">
                            {isDragging ? "Suelta el archivo aquí" : "Arrastra un archivo o haz clic para seleccionar"}
                          </p>
                          <p className="text-xs text-muted-foreground">Solo archivos .docx (máximo 10MB)</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                          <FileText className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{uploadedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(uploadedFile.size)} • Listo para subir
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Cargado
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              setUploadedFile(null)
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {createStep === 3 && (
              <div className="space-y-6">
                <Alert className="border-green-500/20 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-500">Todo listo</AlertTitle>
                  <AlertDescription>Revisa la información antes de crear la plantilla.</AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Nombre de la Plantilla</p>
                    <p className="mt-1 font-medium">{templateName}</p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Tipo de Proceso</p>
                    <div className="mt-1 flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-primary" />
                      <span className="font-medium">{selectedProcessType?.name}</span>
                    </div>
                  </div>

                  {templateDescription && (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Descripción</p>
                      <p className="mt-1">{templateDescription}</p>
                    </div>
                  )}

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Archivo</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <FileText className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">{uploadedFile?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {uploadedFile && formatFileSize(uploadedFile.size)}
                        </p>
                      </div>
                    </div>
                  </div>
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
                <Button onClick={handleCreateTemplate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Plantilla
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
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <DialogTitle>{selectedTemplate?.name}</DialogTitle>
                <DialogDescription>Detalles de la plantilla</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedTemplate && (
            <div className="py-4">
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Tipo de Proceso</p>
                  <div className="mt-1 flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    <span className="font-medium">{getProcessType(selectedTemplate.processTypeId)?.name}</span>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Archivo</p>
                  <div className="mt-1 flex items-center gap-2">
                    <File className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{selectedTemplate.fileUrl}</span>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                  <p className="mt-1 font-medium">
                    {new Date(selectedTemplate.createdAt).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent">
                  <Upload className="mr-2 h-4 w-4" />
                  Reemplazar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
