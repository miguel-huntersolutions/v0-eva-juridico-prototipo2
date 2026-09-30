"use client"

/**
 * CAP-09: página de auditoría y trazabilidad (solo admin).
 *
 * - RF-031: consulta del registro de eventos (inalterable en BD).
 * - RF-032: exportación CSV con cabecera de entidad y rango.
 * - RF-041: vista por entidad de los documentos generados (tipo, proceso,
 *   estado, fecha de versión vigente, responsable).
 */

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollText, Download, Loader2, Building, FileText } from "lucide-react"
import { useProfile } from "@/hooks/use-profile"
import { getEntities, type Entity } from "@/lib/supabase/client-data-access"

interface AuditEvent {
  id: string
  action: string
  actionLabel: string
  actorName: string
  processCode: string | null
  details: Record<string, unknown> | null
  ip: string | null
  createdAt: string
}

interface GeneratedDoc {
  id: string
  documentName: string
  documentType: string
  processCode: string
  status: string
  version: number
  isCurrentVersion: boolean
  currentVersionDate: string
  responsibleName: string | null
}

const DOC_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente de revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString("es-CO")} ${d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`
}

function detailsToText(details: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) return ""
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ")
}

export default function AuditPage() {
  const { profile, isLoading: isLoadingProfile } = useProfile()
  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin"

  const [entities, setEntities] = React.useState<Entity[]>([])
  const [entityFilter, setEntityFilter] = React.useState<string>("all")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")

  const [events, setEvents] = React.useState<AuditEvent[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = React.useState(false)
  const [eventsError, setEventsError] = React.useState<string | null>(null)

  const [entityDocs, setEntityDocs] = React.useState<GeneratedDoc[]>([])
  const [entityDocsName, setEntityDocsName] = React.useState<string | null>(null)
  const [isLoadingDocs, setIsLoadingDocs] = React.useState(false)

  // Cargar entidades de la organización
  React.useEffect(() => {
    if (!profile?.organization_id) return
    getEntities(profile.organization_id)
      .then(setEntities)
      .catch(() => setEntities([]))
  }, [profile?.organization_id])

  const buildQuery = React.useCallback(() => {
    const params = new URLSearchParams()
    if (entityFilter !== "all") params.set("entityId", entityFilter)
    if (fromDate) params.set("from", fromDate)
    if (toDate) params.set("to", toDate)
    return params.toString()
  }, [entityFilter, fromDate, toDate])

  const loadEvents = React.useCallback(async () => {
    setIsLoadingEvents(true)
    setEventsError(null)
    try {
      const res = await fetch(`/api/audit?${buildQuery()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la auditoría")
      setEvents(data.events || [])
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : "Error al cargar la auditoría")
      setEvents([])
    } finally {
      setIsLoadingEvents(false)
    }
  }, [buildQuery])

  // Cargar eventos al entrar y al cambiar filtros
  React.useEffect(() => {
    if (isAdmin) loadEvents()
  }, [isAdmin, loadEvents])

  // RF-041: al seleccionar una entidad, cargar sus documentos generados
  React.useEffect(() => {
    if (!isAdmin || entityFilter === "all") {
      setEntityDocs([])
      setEntityDocsName(null)
      return
    }
    let cancelled = false
    setIsLoadingDocs(true)
    fetch(`/api/entities/${entityFilter}/generated-documents`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Error")
        if (!cancelled) {
          setEntityDocs(data.documents || [])
          setEntityDocsName(data.entityName || null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntityDocs([])
          setEntityDocsName(null)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDocs(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin, entityFilter])

  if (isLoadingProfile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // CA-031.3: un asesor no puede abrir el registro de auditoría
  if (!isAdmin) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <ScrollText className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">Acceso restringido</p>
        <p className="text-sm text-muted-foreground">
          Solo el administrador de la organización puede consultar la auditoría.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ScrollText className="h-6 w-6" />
          Auditoría y Trazabilidad
        </h1>
        <p className="text-sm text-muted-foreground">
          Registro inalterable de eventos de la organización: procesos, documentos, asignaciones y accesos.
        </p>
      </div>

      {/* Filtros (RF-032) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Filtra por entidad y/o rango de fechas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="audit-entity">Entidad</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger id="audit-entity" className="w-full sm:w-[240px]">
                  <Building className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Entidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las entidades</SelectItem>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-from">Desde</Label>
              <Input
                id="audit-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-to">Hasta</Label>
              <Input
                id="audit-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(`/api/audit?${buildQuery()}&format=csv`, "_blank")}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Eventos (RF-031) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro de eventos</CardTitle>
          <CardDescription>
            {events.length} evento(s). El registro es inalterable: no puede editarse ni borrarse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEvents ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : eventsError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {eventsError}
            </p>
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay eventos con los filtros seleccionados.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Fecha y hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Proceso</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="w-[110px]">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(ev.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">{ev.actorName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {ev.actionLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{ev.processCode || "—"}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                        {detailsToText(ev.details) || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ev.ip || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RF-041: documentos generados por entidad */}
      {entityFilter !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Documentos generados{entityDocsName ? ` — ${entityDocsName}` : ""}
            </CardTitle>
            <CardDescription>
              Contratos y documentos generados en EVA para esta entidad (los anteriores a EVA no se incluyen).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDocs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : entityDocs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Esta entidad aún no tiene documentos generados.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de documento</TableHead>
                      <TableHead>Proceso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Versión</TableHead>
                      <TableHead>Fecha versión vigente</TableHead>
                      <TableHead>Responsable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entityDocs
                      .filter((d) => d.isCurrentVersion)
                      .map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-sm">{d.documentType}</TableCell>
                          <TableCell className="font-mono text-xs">{d.processCode}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {DOC_STATUS_LABELS[d.status] ?? d.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">v{d.version}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateTime(d.currentVersionDate)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {d.responsibleName || (
                              <span className="text-xs italic text-muted-foreground">Sin asignar</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
