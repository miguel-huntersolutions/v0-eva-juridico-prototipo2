"use client"

import * as React from "react"
import { Sparkles, Loader2, CheckCircle2, Clock, Scale, FileText, Info, ChevronRight, Wand2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  mockSecretaries,
  mockProcessTypes,
  processTypeConfigs,
  type Entity,
  type ProcessTypeConfig,
  type ProcessTypeField,
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface CreateProcessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity: Entity
}

// AI improvement suggestions based on field type
const aiImprovements: Record<string, (text: string, entityName: string) => string> = {
  object: (text, entityName) =>
    text
      ? `Contratación para ${text.toLowerCase().includes("adquisición") ? "" : "la adquisición de "}${text}${text.includes(entityName) ? "" : `, en cumplimiento de los fines misionales de ${entityName}`}.`
      : "",
  justification: (text, entityName) =>
    text
      ? `${text}\n\nEsta necesidad se encuentra debidamente justificada en el marco del Plan de Desarrollo Territorial vigente y está incluida en el Plan Anual de Adquisiciones de ${entityName}, garantizando así el cumplimiento de los principios de planeación y transparencia que rigen la contratación estatal.`
      : "",
  scope: (text) =>
    text
      ? `El alcance del presente proceso comprende: ${text}\n\nLo anterior incluye todas las actividades necesarias para garantizar la correcta ejecución del objeto contractual, de conformidad con las especificaciones técnicas establecidas.`
      : "",
  obligations: (text) =>
    text
      ? `El contratista deberá cumplir con las siguientes obligaciones:\n\n1. ${text
          .split(",")
          .map((o) => o.trim())
          .join(
            "\n2. ",
          )}\n\nAdicionales:\n- Cumplir con la normatividad vigente aplicable.\n- Presentar informes periódicos de avance.\n- Garantizar la calidad de los bienes o servicios suministrados.`
      : "",
  qualificationCriteria: (text) =>
    text
      ? `Los criterios de calificación serán los siguientes:\n\n${text}\n\nLa evaluación se realizará conforme a lo establecido en el artículo 5 de la Ley 1150 de 2007 y el Decreto 1082 de 2015, garantizando la selección objetiva del contratista.`
      : "",
  experience: (text) =>
    text
      ? `Se requiere acreditar la siguiente experiencia:\n\n${text}\n\nLa experiencia deberá ser certificada mediante contratos ejecutados y actas de liquidación o certificaciones de cumplimiento expedidas por las entidades contratantes.`
      : "",
  guarantees: (text) =>
    text
      ? `El contratista seleccionado deberá constituir garantía única de cumplimiento que ampare:\n\n${text}\n\nLas garantías deberán cumplir con los requisitos establecidos en el Decreto 1082 de 2015 y permanecer vigentes durante el plazo de ejecución y cuatro (4) meses más.`
      : "",
  default: (text) => (text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}${text.endsWith(".") ? "" : "."}` : ""),
}

export function CreateProcessDialog({ open, onOpenChange, entity }: CreateProcessDialogProps) {
  const [step, setStep] = React.useState(1)
  const [selectedProcessType, setSelectedProcessType] = React.useState<ProcessTypeConfig | null>(null)
  const [formData, setFormData] = React.useState<Record<string, string>>({
    secretaryId: "",
    processTypeId: "",
  })
  const [improvingField, setImprovingField] = React.useState<string | null>(null)
  const [improvedFields, setImprovedFields] = React.useState<Set<string>>(new Set())

  const secretaries = mockSecretaries.filter((s) => s.entityId === entity.id)

  // Handle process type selection
  const handleProcessTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, processTypeId: value }))
    const config = processTypeConfigs.find((c) => c.id === value)
    setSelectedProcessType(config || null)
    // Reset field values when changing process type
    if (config) {
      const newFormData: Record<string, string> = {
        secretaryId: formData.secretaryId,
        processTypeId: value,
      }
      config.fields.forEach((field) => {
        newFormData[field.name] = ""
      })
      setFormData(newFormData)
      setImprovedFields(new Set())
    }
  }

  // Handle AI improvement for a field
  const handleAIImprove = async (fieldName: string) => {
    const currentValue = formData[fieldName] || ""
    if (!currentValue.trim()) return

    setImprovingField(fieldName)

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const improvementFn = aiImprovements[fieldName] || aiImprovements.default
    const improvedText = improvementFn(currentValue, entity.name)

    setFormData((prev) => ({
      ...prev,
      [fieldName]: improvedText,
    }))

    setImprovedFields((prev) => new Set(prev).add(fieldName))
    setImprovingField(null)
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
    // Remove from improved fields if user edits after improvement
    if (improvedFields.has(fieldName)) {
      setImprovedFields((prev) => {
        const newSet = new Set(prev)
        newSet.delete(fieldName)
        return newSet
      })
    }
  }

  const handleClose = () => {
    setStep(1)
    setSelectedProcessType(null)
    setFormData({ secretaryId: "", processTypeId: "" })
    setImprovedFields(new Set())
    onOpenChange(false)
  }

  const handleContinue = () => {
    if (step === 1 && selectedProcessType) {
      setStep(2)
    }
  }

  const handleCreate = () => {
    // Here you would submit the form data
    console.log("Creating process with data:", formData)
    handleClose()
  }

  const canContinue = formData.secretaryId && formData.processTypeId && selectedProcessType

  // Render a form field based on its configuration
  const renderField = (field: ProcessTypeField) => {
    const isImproving = improvingField === field.name
    const isImproved = improvedFields.has(field.name)
    const hasValue = (formData[field.name] || "").trim().length > 0

    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {isImproved && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              >
                <Sparkles className="h-3 w-3" />
                Mejorado
              </Badge>
            )}
          </div>
          {/* AI Improve Button */}
          {(field.type === "text" || field.type === "textarea") && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 gap-1.5 text-xs transition-all",
                      hasValue && !isImproved
                        ? "text-primary hover:text-primary hover:bg-primary/10"
                        : "text-muted-foreground",
                    )}
                    disabled={!hasValue || isImproving}
                    onClick={() => handleAIImprove(field.name)}
                  >
                    {isImproving ? (
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

        {field.type === "textarea" ? (
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            rows={4}
            value={formData[field.name] || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={cn("resize-none transition-all", isImproved && "border-emerald-500/30 bg-emerald-500/5")}
          />
        ) : field.type === "select" ? (
          <Select value={formData[field.name] || ""} onValueChange={(v) => handleFieldChange(field.name, v)}>
            <SelectTrigger id={field.id}>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === "number" ? (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder}
            value={formData[field.name] || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        ) : (
          <Input
            id={field.id}
            type="text"
            placeholder={field.placeholder}
            value={formData[field.name] || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={cn("transition-all", isImproved && "border-emerald-500/30 bg-emerald-500/5")}
          />
        )}

        {field.helpText && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            {field.helpText}
          </p>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Crear Nuevo Proceso</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Selecciona el tipo de proceso para ver los requisitos y campos a diligenciar"
              : `Diligencia los campos requeridos para ${selectedProcessType?.name}`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 py-2 flex-shrink-0">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            1
          </div>
          <div className="flex-1 text-sm text-muted-foreground">Selección</div>
          <div className={cn("h-0.5 w-8 transition-colors", step >= 2 ? "bg-primary" : "bg-muted")} />
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            2
          </div>
          <div className="flex-1 text-sm text-muted-foreground">Diligenciamiento</div>
        </div>

        {/* Dynamic Form Fields */}
        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          {step === 1 ? (
            <div className="space-y-6 py-4">
              {/* Secretary and Process Type Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="secretary">Secretaría</Label>
                  <Select
                    value={formData.secretaryId}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, secretaryId: v }))}
                  >
                    <SelectTrigger id="secretary">
                      <SelectValue placeholder="Seleccionar secretaría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {secretaries.map((sec) => (
                        <SelectItem key={sec.id} value={sec.id}>
                          {sec.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="processType">Tipo de Proceso</Label>
                  <Select value={formData.processTypeId} onValueChange={handleProcessTypeChange}>
                    <SelectTrigger id="processType">
                      <SelectValue placeholder="Seleccionar tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProcessTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Process Type Requirements Panel */}
              {selectedProcessType && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Scale className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{selectedProcessType.name}</CardTitle>
                        <CardDescription>{selectedProcessType.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Legal Basis and Duration */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-start gap-2 rounded-lg border bg-background p-3">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Base Legal</p>
                          <p className="text-sm">{selectedProcessType.legalBasis}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 rounded-lg border bg-background p-3">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Duración Estimada</p>
                          <p className="text-sm">{selectedProcessType.estimatedDuration}</p>
                        </div>
                      </div>
                    </div>

                    {/* Requirements List */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Requisitos del Proceso
                      </h4>
                      <ul className="space-y-1.5">
                        {selectedProcessType.requirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Fields Preview */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Campos a Diligenciar ({selectedProcessType.fields.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProcessType.fields.map((field) => (
                          <Badge key={field.id} variant="outline" className="text-xs">
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!selectedProcessType && formData.processTypeId === "" && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Scale className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">Selecciona un tipo de proceso para ver sus requisitos</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Entity and Process Type Info */}
              <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/50">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Entidad</p>
                  <p className="text-sm font-medium">{entity.name}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Tipo de Proceso</p>
                  <p className="text-sm font-medium">{selectedProcessType?.name}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Secretaría</p>
                  <p className="text-sm font-medium">{secretaries.find((s) => s.id === formData.secretaryId)?.name}</p>
                </div>
              </div>

              {/* AI Assistance Banner */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Asistencia de IA disponible</p>
                  <p className="text-xs text-muted-foreground">
                    Escribe en cada campo y usa el botón "Mejorar con IA" para optimizar la redacción jurídica
                  </p>
                </div>
              </div>

              {/* Dynamic Form Fields */}
              <div className="space-y-5">{selectedProcessType?.fields.map((field) => renderField(field))}</div>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="pt-4 border-t flex-shrink-0">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleContinue} disabled={!canContinue} className="gap-2">
                Continuar
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button onClick={handleCreate} className="gap-2">
                <FileText className="h-4 w-4" />
                Crear Proceso
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
