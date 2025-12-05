"use client"

import * as React from "react"
import { Loader2, Scale, FileText, ChevronRight } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getProcessTypes,
  getSecretaries,
  createProcess,
  generateProcessCode,
  type ProcessType,
} from "@/lib/supabase/client-data-access"
import type { Process } from "@/lib/mock-data"
import { useProfile } from "@/hooks/use-profile"

interface CreateProcessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProcessCreated?: (process: Process) => void
}

interface FormData {
  secretaryId: string
  processTypeId: string
  object: string
  description: string
  entityId: string
}

interface Secretary {
  id: string
  name: string
  entity_id: string
}

export function CreateProcessDialog({ open, onOpenChange, onProcessCreated }: CreateProcessDialogProps) {
  const { profile } = useProfile()
  const [step, setStep] = React.useState(1)
  const [formData, setFormData] = React.useState<FormData>({
    secretaryId: "",
    processTypeId: "",
    object: "",
    description: "",
    entityId: "",
  })
  const [selectedProcessType, setSelectedProcessType] = React.useState<ProcessType | null>(null)

  const [processTypes, setProcessTypes] = React.useState<ProcessType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = React.useState(true)
  const [secretaries, setSecretaries] = React.useState<Secretary[]>([])
  const [isLoadingSecretaries, setIsLoadingSecretaries] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadProcessTypes() {
      try {
        const types = await getProcessTypes()
        setProcessTypes(types)
      } catch (error) {
        console.error("Error loading process types:", error)
      } finally {
        setIsLoadingTypes(false)
      }
    }
    if (open) {
      loadProcessTypes()
    }
  }, [open])

  React.useEffect(() => {
    async function loadSecretaries() {
      if (!formData.entityId) {
        setSecretaries([])
        return
      }
      try {
        setIsLoadingSecretaries(true)
        const data = await getSecretaries(formData.entityId)
        setSecretaries(data)
      } catch (error) {
        console.error("Error loading secretaries:", error)
      } finally {
        setIsLoadingSecretaries(false)
      }
    }
    loadSecretaries()
  }, [formData.entityId])

  const handleClose = () => {
    setStep(1)
    setFormData({
      secretaryId: "",
      processTypeId: "",
      object: "",
      description: "",
      entityId: "",
    })
    setSelectedProcessType(null)
    setError(null)
    onOpenChange(false)
  }

  const handleProcessTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, processTypeId: value }))
    const processType = processTypes.find((pt) => pt.id === value)
    setSelectedProcessType(processType || null)
  }

  const handleContinue = () => {
    if (step === 1 && canContinue) {
      setStep(2)
    }
  }

  const handleCreate = async () => {
    if (!profile) return

    try {
      setIsSaving(true)
      setError(null)

      const code = await generateProcessCode(formData.processTypeId)

      const newProcess = await createProcess({
        code,
        object: formData.object,
        description: formData.description,
        entityId: formData.entityId,
        secretaryId: formData.secretaryId,
        processTypeId: formData.processTypeId,
        status: "draft",
        createdBy: profile.id,
      })

      if (onProcessCreated) {
        onProcessCreated(newProcess)
      }

      handleClose()
    } catch (err) {
      console.error("Error creating process:", err)
      setError("Error al crear el proceso. Por favor intente de nuevo.")
    } finally {
      setIsSaving(false)
    }
  }

  const canContinue = formData.secretaryId && formData.processTypeId && selectedProcessType
  const canCreate = formData.object.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Crear Nuevo Proceso
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Selecciona la secretaría y el tipo de proceso para comenzar"
              : "Completa la información del proceso"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            1
          </div>
          <div className={`h-1 flex-1 rounded ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            2
          </div>
        </div>

        {error && <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">{error}</div>}

        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          {step === 1 ? (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="entity">Entidad</Label>
                <Select
                  value={formData.entityId}
                  onValueChange={(v) => {
                    setFormData((prev) => ({ ...prev, entityId: v, secretaryId: "" }))
                  }}
                >
                  <SelectTrigger id="entity">
                    <SelectValue placeholder="Seleccionar entidad..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder">Seleccione primero una entidad</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Selecciona la entidad para la cual se creará el proceso</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="secretary">Secretaría</Label>
                  <Select
                    value={formData.secretaryId}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, secretaryId: v }))}
                    disabled={!formData.entityId || isLoadingSecretaries}
                  >
                    <SelectTrigger id="secretary">
                      <SelectValue placeholder={isLoadingSecretaries ? "Cargando..." : "Seleccionar secretaría..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {secretaries.map((sec) => (
                        <SelectItem key={sec.id} value={sec.id}>
                          {sec.name}
                        </SelectItem>
                      ))}
                      {secretaries.length === 0 && !isLoadingSecretaries && (
                        <SelectItem value="none" disabled>
                          No hay secretarías disponibles
                        </SelectItem>
                      )}
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
                      {isLoadingTypes ? (
                        <SelectItem value="loading" disabled>
                          Cargando tipos de proceso...
                        </SelectItem>
                      ) : (
                        processTypes.map((pt) => (
                          <SelectItem key={pt.id} value={pt.id}>
                            {pt.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedProcessType && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      {selectedProcessType.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{selectedProcessType.description}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="object">Objeto del Proceso *</Label>
                <Textarea
                  id="object"
                  placeholder="Ej: Adquisición de equipos de cómputo para la Secretaría de Hacienda"
                  value={formData.object}
                  onChange={(e) => setFormData((prev) => ({ ...prev, object: e.target.value }))}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">Describe brevemente el objeto del contrato o proceso</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción Detallada</Label>
                <Textarea
                  id="description"
                  placeholder="Proporciona detalles adicionales sobre el proceso, alcance, especificaciones técnicas, etc."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="min-h-[120px]"
                />
              </div>

              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resumen del Proceso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium">{selectedProcessType?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado inicial:</span>
                    <Badge variant="secondary">Borrador</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
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
              <Button variant="outline" onClick={() => setStep(1)} disabled={isSaving}>
                Atrás
              </Button>
              <Button onClick={handleCreate} disabled={!canCreate || isSaving} className="gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Crear Proceso
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
