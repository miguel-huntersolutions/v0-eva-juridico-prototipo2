"use client"

/**
 * CAP-11 (RF-046): administración de los periodos de ley de garantías.
 * Solo superadministrador. Las fechas viven en BD (RNF-14) y EVA advierte
 * cuando una etapa de un proceso cae dentro de un periodo activo.
 */

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Scale, Plus, Loader2, Trash2 } from "lucide-react"

interface Period {
  id: string
  name: string
  starts_on: string
  ends_on: string
  scope: string | null
  created_at: string
}

function isActive(p: Period): boolean {
  const today = new Date().toISOString().split("T")[0]
  return p.starts_on <= today && today <= p.ends_on
}

export default function GuaranteeLawPage() {
  const [periods, setPeriods] = React.useState<Period[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [name, setName] = React.useState("")
  const [startsOn, setStartsOn] = React.useState("")
  const [endsOn, setEndsOn] = React.useState("")
  const [scope, setScope] = React.useState("")

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/guarantee-law-periods")
      const data = await res.json().catch(() => ({}))
      if (res.ok) setPeriods(data.periods || [])
    } catch {
      // silencioso
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const handleCreate = async () => {
    if (!name.trim() || !startsOn || !endsOn) {
      setError("Nombre, fecha de inicio y fecha de fin son obligatorios")
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/guarantee-law-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), startsOn, endsOn, scope: scope.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "No se pudo crear el periodo")
      setName("")
      setStartsOn("")
      setEndsOn("")
      setScope("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este periodo de ley de garantías?")) return
    try {
      const res = await fetch(`/api/guarantee-law-periods?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "No se pudo eliminar")
      }
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Scale className="h-6 w-6" />
          Ley de garantías
        </h1>
        <p className="text-sm text-muted-foreground">
          Periodos de restricción a la contratación pública. EVA advierte cuando la fecha de una etapa cae dentro
          de un periodo activo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuevo periodo</CardTitle>
          <CardDescription>Ej: elecciones regionales, con su fecha de inicio y fin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="period-name">Nombre</Label>
              <Input
                id="period-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Elecciones regionales 2027"
                className="w-[240px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="period-start">Inicio</Label>
              <Input
                id="period-start"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="period-end">Fin</Label>
              <Input
                id="period-end"
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="period-scope">Alcance (opcional)</Label>
              <Input
                id="period-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="Qué restrige"
                className="w-[220px]"
              />
            </div>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Agregar
            </Button>
          </div>
          {error && (
            <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Periodos cargados</CardTitle>
          <CardDescription>{periods.length} periodo(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : periods.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay periodos cargados. Agrega el primero arriba.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Alcance</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm">{p.starts_on}</TableCell>
                      <TableCell className="text-sm">{p.ends_on}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                        {p.scope || "—"}
                      </TableCell>
                      <TableCell>
                        {isActive(p) ? (
                          <Badge variant="destructive">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
