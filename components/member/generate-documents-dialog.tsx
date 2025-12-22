"use client"

import * as React from "react"
import {
  Loader2,
  FileText,
  Wand2,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Upload,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getTemplates, createProcess, getProcessesMapped, type Template, type ProcessMapped, type Entity } from "@/lib/supabase/client-data-access"
import { getAllUniqueTags } from "@/lib/utils/document-generator"
import { useProfile } from "@/hooks/use-profile"

interface ProcessData {
  code: string
  object: string
  description: string
  entityId: string
  secretaryId: string
  processTypeId: string
  status: "draft" | "in_progress" | "review" | "completed" | "archived"
  createdBy: string
}

interface GenerateDocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  process: ProcessMapped | null // For existing processes
  processData?: ProcessData | null // For new processes (not yet created)
  entity: Entity | null
  secretaryName: string
  processTypeName?: string
  onProcessCreated?: (process: ProcessMapped) => void
  onDocumentsGenerated?: () => void // Callback to refresh processes list
}

export function GenerateDocumentsDialog({
  open,
  onOpenChange,
  process,
  processData,
  entity,
  secretaryName,
  processTypeName,
  onProcessCreated,
  onDocumentsGenerated,
}: GenerateDocumentsDialogProps) {
  const { profile } = useProfile()
  
  // Determine if this is a new process (not yet created) or existing
  const isNewProcess = !!processData && !process
  const currentProcess = process || (processData ? {
    id: "", // Will be set after creation
    code: processData.code,
    processTypeId: processData.processTypeId,
    processTypeName: processTypeName || "",
    entityId: processData.entityId,
    entityName: entity?.name || "",
    secretaryId: processData.secretaryId,
    secretaryName: secretaryName,
  } as Partial<ProcessMapped> : null)
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0) // Step index (0-based)
  const [formData, setFormData] = React.useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [improvingField, setImprovingField] = React.useState<string | null>(null)
  const [improvedFields, setImprovedFields] = React.useState<Set<string>>(new Set())
  const [generatedDocuments, setGeneratedDocuments] = React.useState<
    Array<{ templateId: string; documentName: string; drivePath: string }>
  >([])

  // Get all unique tags from all templates
  const allTags = React.useMemo(() => {
    if (templates.length === 0) return []
    return getAllUniqueTags(templates)
  }, [templates])

  // Load templates when dialog opens and process/processData is available
  React.useEffect(() => {
    async function loadTemplates() {
      const processTypeId = process?.processTypeId || processData?.processTypeId
      if (!open || !processTypeId) {
        setTemplates([])
        return
      }

      try {
        setIsLoadingTemplates(true)
        const data = await getTemplates(processTypeId)
        setTemplates(data)
        
        // Initialize form data with empty values for all tags
        const initialData: Record<string, string> = {}
        const tags = getAllUniqueTags(data)
        tags.forEach((tag) => {
          initialData[tag] = ""
        })
        
        // Auto-fill ENTIDAD and SECRETARIA if they exist
        if (tags.includes("ENTIDAD") && entity?.name) {
          initialData.ENTIDAD = entity.name
        }
        if (tags.includes("SECRETARIA") && secretaryName) {
          initialData.SECRETARIA = secretaryName
        }
        
        setFormData(initialData)
        setCurrentStep(0)
        setGeneratedDocuments([])
        setError(null)
      } catch (error) {
        console.error("Error loading templates:", error)
        setError("Error al cargar las plantillas. Por favor intente de nuevo.")
      } finally {
        setIsLoadingTemplates(false)
      }
    }

    loadTemplates()
  }, [open, process?.processTypeId, processData?.processTypeId, entity?.name, secretaryName])

  const handleClose = () => {
    setFormData({})
    setCurrentStep(0)
    setGeneratedDocuments([])
    setError(null)
    setImprovedFields(new Set())
    setImprovingField(null)
    onOpenChange(false)
  }

  const handleFieldChange = (tag: string, value: string) => {
    setFormData((prev) => ({ ...prev, [tag]: value }))
    // Remove from improved fields if user edits after improvement
    if (improvedFields.has(tag)) {
      setImprovedFields((prev) => {
        const newSet = new Set(prev)
        newSet.delete(tag)
        return newSet
      })
    }
  }

  const handleAIImprove = async (tag: string) => {
    const currentValue = formData[tag] || ""
    if (!currentValue.trim()) return

    setImprovingField(tag)

    try {
      const response = await fetch("/api/improve-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: currentValue,
          fieldName: tag.toLowerCase(),
          fieldLabel: tag.replace(/_/g, " "),
          fieldHelpText: `Mejora el texto para el campo ${tag}`,
          entityName: entity?.name,
          processTypeName: process?.processTypeName,
          secretaryName: secretaryName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to improve text")
      }

      const data = await response.json()
      const improvedText = data.improvedText

      setFormData((prev) => ({
        ...prev,
        [tag]: improvedText,
      }))

      setImprovedFields((prev) => new Set(prev).add(tag))
    } catch (error) {
      console.error("Error improving text:", error)
      setError(error instanceof Error ? error.message : "Error al mejorar el texto. Por favor intenta de nuevo.")
    } finally {
      setImprovingField(null)
    }
  }

  const handleGenerateDocument = async (template: Template) => {
    const processCode = process?.code || processData?.code
    if (!processCode) return

    try {
      setIsGenerating(true)
      setError(null)

      // Prepare replacements (remove {{}} from tag names if present)
      const replacements: Record<string, string> = {}
      Object.entries(formData).forEach(([tag, value]) => {
        const cleanTag = tag.replace(/[{}]/g, "")
        replacements[cleanTag] = value || ""
      })

      // Generate document name
      const documentName = `${template.name}_${processCode}_${new Date().toISOString().split("T")[0]}.docx`

      const response = await fetch("/api/generate-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templatePath: template.fileUrl, // This should be the Drive path
          replacements,
          processCode: processCode,
          processId: process?.id || "", // Empty for new processes
          documentName,
          entityName: entity?.name,
          secretaryName: secretaryName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al generar el documento")
      }

      const result = await response.json()

      // Add to generated documents list
      setGeneratedDocuments((prev) => [
        ...prev,
        {
          templateId: template.id,
          documentName: result.documentName,
          drivePath: result.drivePath,
        },
      ])

      return result
    } catch (error) {
      console.error("Error generating document:", error)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateAll = async () => {
    const processCode = process?.code || processData?.code
    if (!processCode || templates.length === 0) return

    try {
      setIsSaving(true)
      setError(null)

      // If this is a new process, create it first
      let createdProcess: ProcessMapped | null = null
      if (isNewProcess && processData) {
        try {
          await createProcess(processData)
          
          // Reload processes to get the mapped version
          const processes = await getProcessesMapped()
          createdProcess = processes.find((p) => p.code === processData.code) || null
          
          if (createdProcess && onProcessCreated) {
            onProcessCreated(createdProcess)
          }
        } catch (createError) {
          console.error("Error creating process:", createError)
          setError("Error al crear el proceso. Por favor intente de nuevo.")
          return
        }
      }

      // Generate all documents
      const results = await Promise.all(
        templates.map((template) => handleGenerateDocument(template)),
      )

      // All documents generated successfully
      // The documents are already saved to Google Drive, Sheets, and Database via the API
      
      // Trigger refresh of processes list to update document count
      if (onDocumentsGenerated) {
        onDocumentsGenerated()
      }
      
      // Close the dialog after successful generation
      if (isNewProcess) {
        handleClose()
      }
    } catch (error) {
      console.error("Error generating documents:", error)
      setError(error instanceof Error ? error.message : "Error al generar los documentos. Por favor intente de nuevo.")
    } finally {
      setIsSaving(false)
    }
  }

  const canProceedToNext = () => {
    // Check if all required tags for current template are filled
    if (currentStep >= templates.length) return false
    const currentTemplate = templates[currentStep]
    if (!currentTemplate.variables || currentTemplate.variables.length === 0) return true
    
    return currentTemplate.variables.every((tag) => {
      const value = formData[tag] || ""
      return value.trim().length > 0
    })
  }

  const canGenerateCurrent = () => {
    if (currentStep >= templates.length) return false
    return canProceedToNext()
  }

  const currentTemplate = templates[currentStep] || null
  const currentTemplateTags = currentTemplate?.variables || []

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generar Documentos del Proceso
          </DialogTitle>
          <DialogDescription>
            {currentProcess && (
              <>
                {isNewProcess ? "Nuevo " : ""}Proceso: <span className="font-mono text-sm">{currentProcess.code}</span> - Completa los campos para cada
                plantilla
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">{error}</div>}

        {isLoadingTemplates ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Cargando plantillas...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No hay plantillas disponibles para este tipo de proceso</p>
          </div>
        ) : (
          <>
            {/* Steps Indicator */}
            <div className="flex items-center gap-2 py-4 overflow-x-auto">
              {templates.map((template, index) => (
                <React.Fragment key={template.id}>
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium shrink-0",
                      index < currentStep
                        ? "bg-primary text-primary-foreground"
                        : index === currentStep
                          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < templates.length - 1 && (
                    <div
                      className={cn(
                        "h-1 w-12 rounded-full shrink-0",
                        index < currentStep ? "bg-primary" : "bg-muted",
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Current Step Content */}
            <div className="flex-1 overflow-y-auto pr-4 -mr-4">
              {currentTemplate && (
                <div className="space-y-6 py-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{currentTemplate.name}</CardTitle>
                      <CardDescription>
                        Completa los siguientes campos para generar este documento
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <div className="space-y-4">
                    {currentTemplateTags.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Esta plantilla no requiere campos adicionales.</p>
                        <p className="text-sm mt-2">Los valores de Entidad y Secretaría se asignarán automáticamente.</p>
                      </div>
                    ) : (
                      currentTemplateTags.map((tag) => (
                        <div key={tag} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`field-${tag}`}>
                                {tag.replace(/_/g, " ")} {tag === "ENTIDAD" || tag === "SECRETARIA" ? "(Auto)" : "*"}
                              </Label>
                              {improvedFields.has(tag) && (
                                <Badge
                                  variant="secondary"
                                  className="h-5 gap-1 text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  Mejorado
                                </Badge>
                              )}
                            </div>
                            {tag !== "ENTIDAD" && tag !== "SECRETARIA" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-7 gap-1.5 text-xs transition-all",
                                        formData[tag]?.trim().length > 0 && !improvedFields.has(tag)
                                          ? "text-primary hover:text-primary hover:bg-primary/10"
                                          : "text-muted-foreground",
                                      )}
                                      disabled={!formData[tag]?.trim() || improvingField === tag}
                                      onClick={() => handleAIImprove(tag)}
                                    >
                                      {improvingField === tag ? (
                                        <>
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          Mejorando...
                                        </>
                                      ) : (
                                        <>
                                          <Wand2 className="h-3 w-3" />
                                          Mejorar con IA
                                        </>
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p className="text-xs">La IA mejorará la redacción jurídica de este campo</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          {(tag === "ENTIDAD" || tag === "SECRETARIA") ? (
                            <Input
                              id={`field-${tag}`}
                              value={formData[tag] || (tag === "ENTIDAD" ? entity?.name || "" : secretaryName)}
                              disabled
                              className="bg-muted"
                            />
                          ) : (
                            <Textarea
                              id={`field-${tag}`}
                              placeholder={`Ingresa el valor para ${tag.replace(/_/g, " ")}`}
                              value={formData[tag] || ""}
                              onChange={(e) => handleFieldChange(tag, e.target.value)}
                              className={cn(
                                "min-h-[100px] transition-all",
                                improvedFields.has(tag) && "border-emerald-500/30 bg-emerald-500/5",
                              )}
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Show generated documents for this template */}
                  {generatedDocuments.some((doc) => doc.templateId === currentTemplate.id) && (
                    <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          <span className="font-medium">Documento generado exitosamente</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="border-t pt-4">
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0 || isGenerating || isSaving}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>

                <div className="flex gap-2">
                  {currentStep < templates.length - 1 ? (
                    <Button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      disabled={!canProceedToNext() || isGenerating || isSaving}
                    >
                      Siguiente
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleGenerateDocument(currentTemplate)}
                        disabled={!canGenerateCurrent() || isGenerating || isSaving}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Generar Este
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleGenerateAll}
                        disabled={isGenerating || isSaving}
                        className="gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {isNewProcess ? "Creando Proceso y Generando..." : "Generando Todos..."}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            {isNewProcess ? "Crear Proceso y Generar Documentos" : "Generar Todos y Guardar"}
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

