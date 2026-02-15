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
  getEntities,
  getEntitiesForImpersonation,
  getMemberAssignedEntities,
  createProcess,
  generateProcessCode,
  getProcessesMapped,
  type ProcessType,
  type EntityMapped,
  type ProcessMapped,
} from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"

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

interface CreateProcessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProcessCreated?: (process: ProcessMapped) => void
  /** Opens generate dialog with process data (process not created yet). */
  onProcessCreatedAndReady?: (processData: ProcessData, entity: EntityMapped | null, secretaryName: string, processTypeName: string) => void
  /** Creates process and navigates to generate page (process created immediately). Always uses form mode. */
  onProcessCreatedAndGoToGenerate?: (process: ProcessMapped) => void
}

interface FormData {
  secretaryId: string
  processTypeId: string
  entityId: string
}

interface Secretary {
  id: string
  name: string
  entity_id: string
}

export function CreateProcessDialog({ open, onOpenChange, onProcessCreated, onProcessCreatedAndReady, onProcessCreatedAndGoToGenerate }: CreateProcessDialogProps) {
  const { profile } = useProfile()
  const { isImpersonating, impersonatedOrg } = useImpersonation()
  const orgId = isImpersonating && impersonatedOrg ? impersonatedOrg.id : profile?.organization_id
  const [formData, setFormData] = React.useState<FormData>({
    secretaryId: "",
    processTypeId: "",
    entityId: "",
  })
  const [selectedProcessType, setSelectedProcessType] = React.useState<ProcessType | null>(null)

  const [processTypes, setProcessTypes] = React.useState<ProcessType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = React.useState(true)
  const [entities, setEntities] = React.useState<EntityMapped[]>([])
  const [isLoadingEntities, setIsLoadingEntities] = React.useState(false)
  const [secretaries, setSecretaries] = React.useState<Secretary[]>([])
  const [isLoadingSecretaries, setIsLoadingSecretaries] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadProcessTypes() {
      try {
        const types = await getProcessTypes()
        setProcessTypes(types)
      } catch (error) {
      } finally {
        setIsLoadingTypes(false)
      }
    }
    if (open) {
      loadProcessTypes()
    }
  }, [open])

  React.useEffect(() => {
    async function loadEntities() {
      if (!orgId || !open) {
        setEntities([])
        return
      }
      if (!isImpersonating && !profile?.id) return
      try {
        setIsLoadingEntities(true)
        const allEntities = isImpersonating
          ? await getEntitiesForImpersonation(orgId)
          : await getEntities(orgId)
        const assignedEntityIds = isImpersonating ? [] : await getMemberAssignedEntities(profile!.id)
        const toShow = isImpersonating
          ? allEntities.filter((e) => e.status === "active")
          : allEntities.filter((e) => assignedEntityIds.includes(e.id) && e.status === "active")
        setEntities(toShow)
      } catch (error) {
      } finally {
        setIsLoadingEntities(false)
      }
    }
    if (open && orgId && (isImpersonating || profile?.id)) loadEntities()
  }, [open, orgId, isImpersonating, profile?.id])

  React.useEffect(() => {
    async function loadSecretaries() {
      if (!formData.entityId || formData.entityId === "placeholder") {
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
    setFormData({
      secretaryId: "",
      processTypeId: "",
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

  const handleContinue = async () => {
    if (!profile) return

    try {
      setError(null)

      const code = await generateProcessCode(formData.processTypeId)
      const selectedEntity = entities.find((e) => e.id === formData.entityId) || null
      const selectedSecretary = secretaries.find((s) => s.id === formData.secretaryId)
      const secretaryName = selectedSecretary?.name || ""
      const selectedProcessType = processTypes.find((pt) => pt.id === formData.processTypeId)
      const processData = {
        code,
        object: "",
        description: "",
        entityId: formData.entityId,
        secretaryId: formData.secretaryId,
        processTypeId: formData.processTypeId,
        status: "draft" as const,
        createdBy: profile.id,
      }

      if (onProcessCreatedAndGoToGenerate) {
        const newProcess = await createProcess({ ...processData, createdBy: profile.id })
        onProcessCreatedAndGoToGenerate(newProcess as unknown as ProcessMapped)
        handleClose()
        return
      }

      if (onProcessCreatedAndReady) {
        onProcessCreatedAndReady(processData, selectedEntity, secretaryName, selectedProcessType?.name || "")
      }
      handleClose()
    } catch (err) {
      setError("Error al preparar el proceso. Por favor intente de nuevo.")
    }
  }

  const canContinue = formData.entityId && formData.entityId !== "placeholder" && formData.secretaryId && formData.processTypeId && selectedProcessType
  const canCreate = true // No longer need object/description validation

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Crear Nuevo Proceso
          </DialogTitle>
          <DialogDescription>
            Selecciona la entidad, secretaría y el tipo de proceso para crear el proceso
          </DialogDescription>
        </DialogHeader>

        {error && <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">{error}</div>}

        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="entity">Entidad</Label>
                <Select
                  value={formData.entityId}
                  onValueChange={(v) => {
                    setFormData((prev) => ({ ...prev, entityId: v, secretaryId: "" }))
                  }}
                  disabled={isLoadingEntities}
                >
                  <SelectTrigger id="entity">
                    <SelectValue placeholder={isLoadingEntities ? "Cargando..." : "Seleccionar entidad..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingEntities ? (
                      <SelectItem value="loading" disabled>
                        Cargando entidades...
                      </SelectItem>
                    ) : (
                      entities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name}
                        </SelectItem>
                      ))
                    )}
                    {entities.length === 0 && !isLoadingEntities && (
                      <SelectItem value="none" disabled>
                        No hay entidades disponibles
                      </SelectItem>
                    )}
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
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleContinue} disabled={!canCreate} className="gap-2">
            <FileText className="h-4 w-4" />
            Continuar
            <ChevronRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
