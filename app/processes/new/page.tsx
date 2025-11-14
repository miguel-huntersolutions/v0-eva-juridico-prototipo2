"use client"

import { useState } from "react"
import { useRouter } from 'next/navigation'
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { dataStore } from "@/lib/data-store"
import type { ProcessType, DocumentField } from "@/lib/types"
import { documentTemplates } from "@/lib/document-templates"
import { ArrowLeft, Save, Send, AlertCircle, Sparkles, Loader2, FileText, CheckCircle2 } from 'lucide-react'
import Link from "next/link"
import { toast } from "sonner"
import { mockClients, mockProcessTypes } from "@/lib/mock-data"
import { DocumentAIAssistant } from "@/components/document-ai-assistant"

export default function NewProcessPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<"input" | "review" | "documents">("input")
  const [generalDescription, setGeneralDescription] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  
  const [formData, setFormData] = useState({
    type: "" as ProcessType | "",
    title: "",
    description: "",
    scopCode: "",
    estimatedValue: "",
    duration: "",
    recommendedTemplate: "",
  })
  
  const [documentFieldValues, setDocumentFieldValues] = useState<Record<string, Record<string, string>>>({})
  
  const [isSaving, setIsSaving] = useState(false)

  if (!user || !["super_admin", "legal_management"].includes(user.role)) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No tienes permisos para crear procesos.</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  const availableClients = user.role === "super_admin" || user.role === "legal_management" 
    ? mockClients 
    : mockClients.filter(c => c.id === user.clientId)

  if (availableClients.length === 1 && !selectedClientId) {
    setSelectedClientId(availableClients[0].id)
  }

  const getProcessTypeTemplates = () => {
    if (!formData.type) return []
    const typeMap: Record<string, string> = {
      "direct_contracting": "pt-1",
      "public_bidding": "pt-2",
      "minor_purchase": "pt-3",
      "legal_consultation": "pt-4"
    }
    const processType = mockProcessTypes.find(pt => pt.id === typeMap[formData.type])
    return processType?.documents || []
  }

  const analyzeWithAI = async () => {
    if (!selectedClientId) {
      toast.error("Selecciona un cliente antes de continuar")
      return
    }

    if (!generalDescription.trim()) {
      toast.error("Por favor ingresa una descripción del proceso")
      return
    }

    setIsAnalyzing(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const lowerDesc = generalDescription.toLowerCase()
    
    let processType: ProcessType = "direct_contracting"
    let estimatedValue = ""
    let duration = ""
    let scopCode = ""
    let title = ""
    let recommendedTemplate = "viability-concept"
    
    if (lowerDesc.includes("licitación") || lowerDesc.includes("licitacion")) {
      processType = "public_bidding"
    } else if (lowerDesc.includes("menor cuantía") || lowerDesc.includes("menor cuantia")) {
      processType = "minor_purchase"
    } else if (lowerDesc.includes("consulta") || lowerDesc.includes("concepto")) {
      processType = "legal_consultation"
      recommendedTemplate = "legal-response"
    } else if (lowerDesc.includes("directa")) {
      processType = "direct_contracting"
    }
    
    const millionsMatch = lowerDesc.match(/(\d+)\s*millones?/i)
    if (millionsMatch) {
      estimatedValue = String(Number.parseInt(millionsMatch[1]) * 1000000)
    }
    
    const durationMatch = lowerDesc.match(/(\d+)\s*(mes|meses|año|años)/i)
    if (durationMatch) {
      const amount = durationMatch[1]
      const unit = durationMatch[2].toLowerCase()
      if (unit.startsWith("mes")) {
        duration = `${amount} ${Number.parseInt(amount) === 1 ? 'mes' : 'meses'}`
      } else {
        duration = `${amount} ${Number.parseInt(amount) === 1 ? 'año' : 'años'}`
      }
    }
    
    if (lowerDesc.includes("abogado")) {
      title = "Contratación de Servicios Profesionales de Abogado"
      scopCode = "81111505"
    } else if (lowerDesc.includes("mantenimiento")) {
      title = "Contratación de Servicios de Mantenimiento"
      scopCode = "81111500"
    } else if (lowerDesc.includes("consultor")) {
      title = "Contratación de Servicios de Consultoría"
      scopCode = "81111501"
    } else if (lowerDesc.includes("construcción") || lowerDesc.includes("construccion")) {
      title = "Contratación de Obra Civil"
      scopCode = "72101500"
    } else {
      title = "Proceso de Contratación"
      scopCode = "81111500"
    }
    
    setFormData({
      type: processType,
      title,
      description: generalDescription,
      scopCode,
      estimatedValue,
      duration,
      recommendedTemplate,
    })
    
    setIsAnalyzing(false)
    setStep("review")
    
    toast.success("Análisis completado", {
      description: "La IA ha extraído la información del proceso. Revisa y ajusta según sea necesario.",
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleDocumentFieldChange = (templateId: string, fieldId: string, value: string) => {
    setDocumentFieldValues(prev => ({
      ...prev,
      [templateId]: {
        ...(prev[templateId] || {}),
        [fieldId]: value
      }
    }))
  }

  const handleAIFieldsUpdate = (templateId: string, fields: Record<string, string>) => {
    setDocumentFieldValues(prev => ({
      ...prev,
      [templateId]: {
        ...(prev[templateId] || {}),
        ...fields
      }
    }))
  }

  const isTemplateComplete = (templateId: string, fields: DocumentField[]) => {
    const values = documentFieldValues[templateId] || {}
    return fields.filter(f => f.required).every(f => values[f.id]?.trim())
  }

  const goToDocuments = () => {
    if (!formData.type || !formData.title || !formData.description || !formData.scopCode) {
      toast.error("Completa todos los campos requeridos antes de continuar")
      return
    }
    setStep("documents")
  }

  const handleSaveDraft = async () => {
    if (!selectedClientId) {
      toast.error("Selecciona un cliente")
      return
    }

    if (!formData.type || !formData.title) {
      toast.error("Completa los campos requeridos", {
        description: "Tipo de proceso y título son obligatorios",
      })
      return
    }

    setIsSaving(true)

    const client = mockClients.find(c => c.id === selectedClientId)
    const clientPrefix = client?.name.includes("Bogotá") ? "BOG" : client?.name.includes("Medellín") ? "MED" : "CLI"
    const typePrefix =
      formData.type === "direct_contracting"
        ? "CD"
        : formData.type === "public_bidding"
          ? "LP"
          : formData.type === "minor_purchase"
            ? "MC"
            : "CL"
    const processNumber = `${clientPrefix}-${typePrefix}-${String(Date.now()).slice(-3)}-2024`

    const newProcess = dataStore.createProcess({
      processNumber,
      clientId: selectedClientId,
      type: formData.type,
      status: "draft",
      title: formData.title,
      description: formData.description,
      scopCode: formData.scopCode || null,
      scopCodeSuggested: null,
      scopCodeConfirmedBy: formData.scopCode ? user.id : null,
      scopCodeConfirmedAt: formData.scopCode ? new Date() : null,
      estimatedValue: formData.estimatedValue ? Number.parseFloat(formData.estimatedValue) : null,
      duration: formData.duration || null,
      createdBy: user.id,
      assignedTo: null,
      submittedAt: null,
      reviewStartedAt: null,
      completedAt: null,
    })

    toast.success("Proceso guardado como borrador")
    router.push(`/processes/${newProcess.id}`)
  }

  const handleSubmitForReview = async () => {
    if (!selectedClientId) {
      toast.error("Selecciona un cliente")
      return
    }

    if (!formData.type || !formData.title || !formData.description || !formData.scopCode) {
      toast.error("Completa todos los campos requeridos", {
        description: "Tipo, título, descripción y código SCOP son obligatorios para enviar a revisión",
      })
      return
    }

    setIsSaving(true)

    const client = mockClients.find(c => c.id === selectedClientId)
    const clientPrefix = client?.name.includes("Bogotá") ? "BOG" : client?.name.includes("Medellín") ? "MED" : "CLI"
    const typePrefix =
      formData.type === "direct_contracting"
        ? "CD"
        : formData.type === "public_bidding"
          ? "LP"
          : formData.type === "minor_purchase"
            ? "MC"
            : "CL"
    const processNumber = `${clientPrefix}-${typePrefix}-${String(Date.now()).slice(-3)}-2024`

    const newProcess = dataStore.createProcess({
      processNumber,
      clientId: selectedClientId,
      type: formData.type,
      status: "pending_review",
      title: formData.title,
      description: formData.description,
      scopCode: formData.scopCode,
      scopCodeSuggested: null,
      scopCodeConfirmedBy: user.id,
      scopCodeConfirmedAt: new Date(),
      estimatedValue: formData.estimatedValue ? Number.parseFloat(formData.estimatedValue) : null,
      duration: formData.duration || null,
      createdBy: user.id,
      assignedTo: null,
      submittedAt: new Date(),
      reviewStartedAt: null,
      completedAt: null,
    })

    toast.success("Proceso enviado a revisión", {
      description: "Los asesores de la firma han sido notificados",
    })
    router.push(`/processes/${newProcess.id}`)
  }

  const getRecommendedTemplateName = () => {
    const template = documentTemplates.find(t => t.id === formData.recommendedTemplate)
    return template?.name || "No recomendado"
  }

  const selectedClient = mockClients.find(c => c.id === selectedClientId)
  const processTemplates = getProcessTypeTemplates()

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/processes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nuevo Proceso</h1>
            <p className="text-muted-foreground">Describe tu proceso y la IA extraerá la información automáticamente</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 ${step === "input" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === "input" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              1
            </div>
            <span className="text-sm font-medium">Descripción</span>
          </div>
          <Separator className="w-12" />
          <div className={`flex items-center gap-2 ${step === "review" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === "review" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              2
            </div>
            <span className="text-sm font-medium">Revisión</span>
          </div>
          <Separator className="w-12" />
          <div className={`flex items-center gap-2 ${step === "documents" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === "documents" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              3
            </div>
            <span className="text-sm font-medium">Documentos</span>
          </div>
        </div>

        {step === "input" && (
          <div className="space-y-6">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Selección de Cliente</CardTitle>
                <CardDescription>
                  Selecciona el municipio o alcaldía para el cual se creará el proceso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente (Municipio/Alcaldía) *</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.nit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedClient && (
                    <p className="text-xs text-muted-foreground">
                      Contacto: {selectedClient.contactName} ({selectedClient.contactEmail})
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Describe tu proceso</CardTitle>
                    <CardDescription>
                      Escribe en lenguaje natural y la IA extraerá automáticamente el tipo, valor, código SCOP y más
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="general-description">Descripción General del Proceso</Label>
                  <Textarea
                    id="general-description"
                    placeholder='Ejemplo: "Quiero crear un proceso para la contratación de un abogado para el estudio de los procesos jurídicos de la alcaldía, el presupuesto asignado es de 30 millones de pesos y la contratación será directa por 6 meses"'
                    value={generalDescription}
                    onChange={(e) => setGeneralDescription(e.target.value)}
                    className="min-h-[200px] text-base"
                    disabled={isAnalyzing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Incluye: tipo de contratación, objeto, presupuesto, duración y cualquier detalle relevante
                  </p>
                </div>

                <Button 
                  onClick={analyzeWithAI} 
                  disabled={!generalDescription.trim() || !selectedClientId || isAnalyzing}
                  className="w-full"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analizando con IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Analizar con IA
                    </>
                  )}
                </Button>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    La IA extraerá automáticamente: tipo de proceso, título, valor estimado, código SCOP, duración y plantilla de documento recomendada. Podrás revisar y ajustar toda la información antes de guardar.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-6">
            <Alert className="bg-primary/5 border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong>Cliente:</strong> {selectedClient?.name} • La IA ha analizado tu descripción y extraído la siguiente información. Revisa y ajusta según sea necesario.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Información Extraída por IA</CardTitle>
                <CardDescription>Revisa y edita los campos según sea necesario</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Proceso *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct_contracting">Contratación Directa</SelectItem>
                      <SelectItem value="public_bidding">Licitación Pública</SelectItem>
                      <SelectItem value="minor_purchase">Compra de Menor Cuantía</SelectItem>
                      <SelectItem value="legal_consultation">Consulta Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título del Proceso *</Label>
                  <Input
                    id="title"
                    placeholder="Ej: Contratación de servicios profesionales"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción del Objeto *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe detalladamente el objeto del contrato o consulta..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="min-h-32"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scopCode">Código SCOP *</Label>
                    <Input
                      id="scopCode"
                      placeholder="Ej: 81111505"
                      value={formData.scopCode}
                      onChange={(e) => handleInputChange("scopCode", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Código sugerido por la IA</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Plazo de Ejecución</Label>
                    <Input
                      id="duration"
                      placeholder="Ej: 6 meses"
                      value={formData.duration}
                      onChange={(e) => handleInputChange("duration", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedValue">Valor Estimado (COP)</Label>
                    <Input
                      id="estimatedValue"
                      type="number"
                      placeholder="Ej: 30000000"
                      value={formData.estimatedValue}
                      onChange={(e) => handleInputChange("estimatedValue", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recommendedTemplate">Plantilla Recomendada</Label>
                    <Input
                      id="recommendedTemplate"
                      value={getRecommendedTemplateName()}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Sugerida automáticamente por la IA</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button 
                onClick={() => setStep("input")} 
                variant="outline" 
                className="bg-transparent"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Editar
              </Button>
              <Button onClick={handleSaveDraft} variant="outline" disabled={isSaving} className="flex-1 bg-transparent">
                <Save className="mr-2 h-4 w-4" />
                Guardar Borrador
              </Button>
              <Button onClick={goToDocuments} disabled={isSaving} className="flex-1">
                Continuar a Documentos
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        )}

        {step === "documents" && (
          <div className="space-y-6">
            <Alert className="bg-primary/5 border-primary/20">
              <FileText className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong>Diligencia los documentos:</strong> Usa el asistente de IA para completar rápidamente los campos o edítalos manualmente.
              </AlertDescription>
            </Alert>

            {processTemplates.length > 0 && (
              <DocumentAIAssistant
                templates={processTemplates}
                onFieldsUpdate={handleAIFieldsUpdate}
                currentValues={documentFieldValues}
              />
            )}

            {processTemplates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    No hay plantillas configuradas para este tipo de proceso
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {processTemplates.map((template, idx) => (
                  <Card key={template.id} className="border-primary/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-xl">{template.name}</CardTitle>
                            {isTemplateComplete(template.id, template.structure.fields) && (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Completo
                              </Badge>
                            )}
                          </div>
                          <CardDescription>{template.description}</CardDescription>
                          <p className="text-sm text-muted-foreground">
                            <strong>Objetivo:</strong> {template.objective}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {template.structure.fields.filter(f => f.required).length} campos requeridos
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {template.structure.fields.map((field) => (
                          <div key={field.id} className="space-y-2">
                            <Label htmlFor={`${template.id}-${field.id}`}>
                              {field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              {field.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            {field.type === "text" && field.description.length > 100 ? (
                              <Textarea
                                id={`${template.id}-${field.id}`}
                                placeholder={field.description}
                                value={documentFieldValues[template.id]?.[field.id] || ""}
                                onChange={(e) => handleDocumentFieldChange(template.id, field.id, e.target.value)}
                                className="min-h-24"
                              />
                            ) : (
                              <Input
                                id={`${template.id}-${field.id}`}
                                type={field.type === "number" || field.type === "currency" ? "number" : field.type === "date" ? "date" : "text"}
                                placeholder={field.description}
                                value={documentFieldValues[template.id]?.[field.id] || ""}
                                onChange={(e) => handleDocumentFieldChange(template.id, field.id, e.target.value)}
                              />
                            )}
                            <p className="text-xs text-muted-foreground">{field.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                onClick={() => setStep("review")} 
                variant="outline" 
                className="bg-transparent"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Button onClick={handleSaveDraft} variant="outline" disabled={isSaving} className="flex-1 bg-transparent">
                <Save className="mr-2 h-4 w-4" />
                Guardar Borrador
              </Button>
              <Button onClick={handleSubmitForReview} disabled={isSaving} className="flex-1">
                <Send className="mr-2 h-4 w-4" />
                Enviar a Revisión
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
