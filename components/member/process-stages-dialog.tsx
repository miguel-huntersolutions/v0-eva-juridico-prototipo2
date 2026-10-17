"use client"

/**
 * CAP-11 (RF-044/RF-046): cronograma de etapas SECOP del proceso.
 * - Seis etapas estándar con fecha y marca de cumplida.
 * - CA-044.3: si una fecha es anterior a la etapa previa, la API pide
 *   confirmación (409) y aquí se muestra el aviso para confirmar.
 * - CA-046.1: si alguna fecha cae en ley de garantías, se muestra la
 *   advertencia con las fechas del periodo y se puede continuar dejando
 *   constancia.
 */

import * as React from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, CalendarClock, AlertTriangle, Save } from "lucide-react"

interface StageRow {
  stageKey: string
  label: string
  dueDate: string | null
  completed: boolean
  overdue: boolean
}

interface GuaranteePeriod {
  name: string
  startsOn: string
  endsOn: string
  scope: string | null
}

export function ProcessStagesDialog({
  processId,
  processCode,
  open,
  onOpenChange,
}: {
  processId: string | null
  processCode?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [stages, setStages] = React.useState<StageRow[]>([])
  const [guaranteePeriods, setGuaranteePeriods] = React.useState<GuaranteePeriod[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [warning, setWarning] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!processId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/processes/${processId}/stages`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el cronograma")
      setStages(data.stages || [])
      setGuaranteePeriods(data.guaranteePeriods || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar")
    } finally {
      setIsLoading(false)
    }
  }, [processId])

  React.useEffect(() => {
    if (open && processId) {
      setWarning(null)
      setSaved(false)
      load()
    }
  }, [open, processId, load])

  const updateStage = (stageKey: string, patch: Partial<StageRow>) => {
    setStages((prev) => prev.map((s) => (s.stageKey === stageKey ? { ...s, ...patch } : s)))
    setSaved(false)
  }

  const handleSave = async (confirmOrder = false, confirmGuarantee = false) => {
    if (!processId) return
    setIsSaving(true)
    setError(null)
    setWarning(null)
    try {
      const res = await fetch(`/api/processes/${processId}/stages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: stages.map((s) => ({ stageKey: s.stageKey, dueDate: s.dueDate || null, completed: s.completed })),
          confirmOrder,
          confirmGuarantee,
        }),
      })
      const data = await res.json().catch(() => ({}))

      // 409 = la API pide confirmación (orden de fechas o ley de garantías)
      if (res.status === 409) {
        setWarning(data.orderWarning || data.guaranteeWarning || "Se requiere confirmación")
        return
      }
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el cronograma")

      setSaved(true)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Cronograma del proceso {processCode ?? ""}
          </DialogTitle>
          <DialogDescription>
            Fechas de las etapas del pliego. EVA alerta al responsable y al administrador 3 días y 1 día antes de
            cada vencimiento.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {guaranteePeriods.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Ley de garantías vigente sobre las fechas cargadas
                </div>
                {guaranteePeriods.map((p) => (
                  <p key={p.name} className="mt-1 text-xs">
                    {p.name}: {p.startsOn} a {p.endsOn}
                    {p.scope ? ` — ${p.scope}` : ""}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {stages.map((s) => (
                <div key={s.stageKey} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <Label className="text-sm">{s.label}</Label>
                    {s.overdue && !s.completed && (
                      <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                        Vencida
                      </Badge>
                    )}
                  </div>
                  <Input
                    type="date"
                    value={s.dueDate ?? ""}
                    onChange={(e) => updateStage(s.stageKey, { dueDate: e.target.value || null })}
                    className="w-[160px]"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox
                      checked={s.completed}
                      onCheckedChange={(checked) => updateStage(s.stageKey, { completed: checked === true })}
                    />
                    Cumplida
                  </label>
                </div>
              ))}
            </div>

            {warning && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                <p className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {warning}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => handleSave(true, true)}
                  disabled={isSaving}
                >
                  Continuar de todos modos (queda constancia)
                </Button>
              </div>
            )}

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {saved && !warning && <p className="text-sm text-green-600">Cronograma guardado ✓</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cerrar
          </Button>
          <Button onClick={() => handleSave()} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar cronograma
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
