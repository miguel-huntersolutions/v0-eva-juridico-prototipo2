"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, ArrowLeft, FileText, Sparkles, Trash2, Save, Eye, Edit } from 'lucide-react'
import { mockProcessTypes } from "@/lib/mock-data"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { toast } from "sonner"
import type { DocumentField, DocumentTemplate } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ProcessTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [processType, setProcessType] = useState(
    mockProcessTypes.find((pt) => pt.id === "pt-1") || mockProcessTypes[0]
  )
  const [showDocumentDialog, setShowDocumentDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewContent, setPreviewContent] = useState("")
  const [analyzingDocument, setAnalyzingDocument] = useState(false)
  
  const [editingDocument, setEditingDocument] = useState<DocumentTemplate | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)

  // Document form state
  const [docName, setDocName] = useState("")
  const [docDescription, setDocDescription] = useState("")
  const [docObjective, setDocObjective] = useState("")
  const [docContent, setDocContent] = useState("")

  const simulateAIAnalysis = (content: string) => {
    // Simular análisis de IA buscando patrones ***
    const fieldRegex = /\*\*\*([a-z_]+)\*\*\*/g
    const matches = [...content.matchAll(fieldRegex)]
    const fields: DocumentField[] = []

    matches.forEach((match, index) => {
      const fieldName = match[1]
      const fieldType = fieldName.includes("valor") || fieldName.includes("cdp")
        ? "currency"
        : fieldName.includes("fecha")
        ? "date"
        : fieldName.includes("numero")
        ? "number"
        : "text"

      fields.push({
        id: `field-${Date.now()}-${index}`,
        name: fieldName,
        placeholder: match[0],
        description: `Campo para ${fieldName.replace(/_/g, " ")}`,
        type: fieldType,
        required: true,
        position: index + 1,
      })
    })

    return fields
  }

  const handleEditDocument = (doc: DocumentTemplate) => {
    setEditingDocument(doc)
    setIsEditMode(true)
    setDocName(doc.name)
    setDocDescription(doc.description)
    setDocObjective(doc.objective)
    setDocContent(doc.structure.content)
    setShowDocumentDialog(true)
  }

  const handleNewDocument = () => {
    setEditingDocument(null)
    setIsEditMode(false)
    setDocName("")
    setDocDescription("")
    setDocObjective("")
    setDocContent("")
    setShowDocumentDialog(true)
  }

  const handleAnalyzeDocument = () => {
    if (!docContent.trim()) {
      toast.error("Por favor ingresa el contenido del documento")
      return
    }

    setAnalyzingDocument(true)

    setTimeout(() => {
      const fields = simulateAIAnalysis(docContent)

      if (fields.length === 0) {
        toast.warning(
          "No se encontraron campos variables. Usa *** para marcar campos editables, ej: ***nombre_campo***"
        )
        setAnalyzingDocument(false)
        return
      }

      if (isEditMode && editingDocument) {
        // Actualizar plantilla existente
        const updatedDocument = {
          ...editingDocument,
          name: docName,
          description: docDescription,
          objective: docObjective,
          structure: {
            content: docContent,
            fields: fields,
            metadata: {
              totalFields: fields.length,
              analyzedAt: new Date(),
              analyzedBy: "user-1",
            },
          },
          updatedAt: new Date(),
        }

        setProcessType({
          ...processType,
          documents: processType.documents.map((doc) =>
            doc.id === editingDocument.id ? updatedDocument : doc
          ),
        })

        toast.success(`Plantilla actualizada: ${fields.length} campos identificados`)
      } else {
        // Crear nueva plantilla
        const newDocument = {
          id: `doc-${Date.now()}`,
          processTypeId: processType.id,
          name: docName,
          description: docDescription,
          objective: docObjective,
          structure: {
            content: docContent,
            fields: fields,
            metadata: {
              totalFields: fields.length,
              analyzedAt: new Date(),
              analyzedBy: "user-1",
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        setProcessType({
          ...processType,
          documents: [...processType.documents, newDocument],
        })

        toast.success(`Plantilla creada: ${fields.length} campos identificados`)
      }

      // Reset form
      setDocName("")
      setDocDescription("")
      setDocObjective("")
      setDocContent("")
      setEditingDocument(null)
      setIsEditMode(false)
      setShowDocumentDialog(false)
      setAnalyzingDocument(false)
    }, 2000)
  }

  const handleDeleteDocument = (docId: string) => {
    setProcessType({
      ...processType,
      documents: processType.documents.filter((doc) => doc.id !== docId),
    })
    toast.success("Plantilla eliminada")
  }

  const handleSave = () => {
    setIsLoading(true)
    setTimeout(() => {
      toast.success("Cambios guardados exitosamente")
      setIsLoading(false)
    }, 1000)
  }

  const handlePreview = (content: string) => {
    setPreviewContent(content)
    setShowPreviewDialog(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/process-types">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{processType.name}</h1>
              <p className="text-muted-foreground">{processType.description}</p>
            </div>
            <Badge variant={processType.active ? "default" : "secondary"}>
              {processType.active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
            <CardDescription>Datos generales del tipo de proceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre del Tipo</Label>
                <Input
                  value={processType.name}
                  onChange={(e) => setProcessType({ ...processType, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={processType.active ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setProcessType({ ...processType, active: value === "active" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={processType.description}
                onChange={(e) => setProcessType({ ...processType, description: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Document Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Plantillas de Documentos</CardTitle>
                <CardDescription>
                  Gestiona las plantillas requeridas para este tipo de proceso
                </CardDescription>
              </div>
              <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewDocument}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Plantilla
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {isEditMode ? "Editar Plantilla de Documento" : "Nueva Plantilla de Documento"}
                    </DialogTitle>
                    <DialogDescription>
                      {isEditMode 
                        ? "Actualiza la plantilla. Usa *** para marcar campos variables, ej: ***nombre_campo***"
                        : "Crea una nueva plantilla. Usa *** para marcar campos variables, ej: ***nombre_campo***"
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nombre de la Plantilla</Label>
                      <Input
                        placeholder="Ej: Estudios Previos"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea
                        placeholder="Describe el propósito de esta plantilla"
                        value={docDescription}
                        onChange={(e) => setDocDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Objetivo</Label>
                      <Textarea
                        placeholder="¿Qué objetivo cumple este documento?"
                        value={docObjective}
                        onChange={(e) => setDocObjective(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contenido del Documento</Label>
                      <Textarea
                        placeholder="Pega aquí el contenido. Usa ***nombre_campo*** para campos variables"
                        value={docContent}
                        onChange={(e) => setDocContent(e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Ejemplo: El contrato es por valor de ***valor_contrato*** y será ejecutado
                        por ***nombre_contratista***
                      </p>
                    </div>
                    <Button
                      onClick={handleAnalyzeDocument}
                      disabled={analyzingDocument || !docName || !docContent}
                      className="w-full"
                    >
                      {analyzingDocument ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                          Analizando con IA...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          {isEditMode ? "Actualizar Plantilla" : "Analizar y Crear Plantilla"}
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {processType.documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No hay plantillas configuradas</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Crea la primera plantilla de documento
                </p>
                <Button onClick={handleNewDocument}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Plantilla
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {processType.documents.map((doc, index) => (
                  <Card key={doc.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            {doc.name}
                          </CardTitle>
                          <CardDescription className="mt-1">{doc.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditDocument(doc)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm">
                          <span className="font-medium">Objetivo:</span> {doc.objective}
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border p-4">
                          <p className="mb-2 text-sm font-medium">Campos Variables</p>
                          <div className="space-y-2">
                            {doc.structure.fields.slice(0, 3).map((field) => (
                              <div
                                key={field.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Badge variant="outline" className="font-mono text-xs">
                                  {field.type}
                                </Badge>
                                <span className="flex-1 truncate">{field.name}</span>
                              </div>
                            ))}
                            {doc.structure.fields.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{doc.structure.fields.length - 3} campos más
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border p-4">
                          <p className="mb-2 text-sm font-medium">Estadísticas</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total campos:</span>
                              <span className="font-medium">
                                {doc.structure.metadata.totalFields}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Analizado:</span>
                              <span className="font-medium">
                                {new Date(doc.structure.metadata.analyzedAt).toLocaleDateString(
                                  "es-CO"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handlePreview(doc.structure.content)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Plantilla Completa
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Vista Previa de Plantilla</DialogTitle>
              <DialogDescription>
                Contenido completo con campos variables marcados
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto rounded-lg border bg-muted/50 p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm">{previewContent}</pre>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
