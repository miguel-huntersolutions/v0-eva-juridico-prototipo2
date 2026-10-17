"use client"

/**
 * CAP-10 (RF-035): el asesor propone una entidad que no existe.
 * Queda pendiente hasta que el administrador la apruebe; no aparece en el
 * selector de procesos (CA-035.1/035.2).
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
import { Loader2, Building } from "lucide-react"

export function ProposeEntityDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = React.useState("")
  const [nit, setNit] = React.useState("")
  const [representativeName, setRepresentativeName] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setName("")
      setNit("")
      setRepresentativeName("")
      setError(null)
      setSaved(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!name.trim() || !nit.trim() || !representativeName.trim()) {
      setError("Nombre, NIT y representante legal son obligatorios")
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/entities/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          nit: nit.trim(),
          representativeName: representativeName.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "No se pudo enviar la propuesta")
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al proponer la entidad")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Proponer entidad
          </DialogTitle>
          <DialogDescription>
            La entidad quedará pendiente de aprobación. El administrador te avisará; hasta entonces no podrás usarla
            en procesos nuevos.
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <p className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
            Propuesta enviada. El administrador la revisará.
          </p>
        ) : (
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="propose-name">Nombre de la entidad</Label>
              <Input
                id="propose-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alcaldía de…"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="propose-nit">NIT</Label>
              <Input id="propose-nit" value={nit} onChange={(e) => setNit(e.target.value)} placeholder="900.000.000-0" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="propose-rep">Representante legal</Label>
              <Input
                id="propose-rep"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {saved ? "Cerrar" : "Cancelar"}
          </Button>
          {!saved && (
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                "Enviar propuesta"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
