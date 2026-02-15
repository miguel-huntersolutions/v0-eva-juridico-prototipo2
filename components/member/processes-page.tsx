"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Plus,
  FolderKanban,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Pencil,
  Download,
  Trash2,
  Archive,
  Filter,
  Building,
  Search,
  X,
  Loader2,
  ExternalLink,
  Play,
  CheckCircle,
  RotateCcw,
  Files,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatsCard } from "@/components/stats-card"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getProcessTypes,
  getEntities,
  getEntitiesForImpersonation,
  getProcessesMapped,
  getProcessesForImpersonation,
  deleteProcess as deleteProcessDB,
  type ProcessType,
  type EntityMapped,
  type ProcessMapped,
} from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import { CreateProcessDialog } from "./create-process-dialog"

type ProcessStatus = "all" | "draft" | "in_progress" | "review" | "completed" | "archived"

export function ProcessesPage() {
  const router = useRouter()
  const { profile } = useProfile()
  const { isImpersonating, impersonatedOrg } = useImpersonation()
  const orgId = isImpersonating && impersonatedOrg ? impersonatedOrg.id : profile?.organization_id
  const [processes, setProcesses] = React.useState<ProcessMapped[]>([])
  const [isLoadingProcesses, setIsLoadingProcesses] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<ProcessStatus>("all")
  const [entityFilter, setEntityFilter] = React.useState<string>("all")
  const [processTypeFilter, setProcessTypeFilter] = React.useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [selectedProcess, setSelectedProcess] = React.useState<ProcessMapped | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)

  const [processTypes, setProcessTypes] = React.useState<ProcessType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = React.useState(true)
  const [entities, setEntities] = React.useState<EntityMapped[]>([])
  const [isLoadingEntities, setIsLoadingEntities] = React.useState(true)

  const loadProcesses = React.useCallback(async () => {
    if (!orgId) return
    try {
      setIsLoadingProcesses(true)
      const data = isImpersonating
        ? await getProcessesForImpersonation(orgId)
        : await getProcessesMapped()
      setProcesses(data)
    } catch (error) {
    } finally {
      setIsLoadingProcesses(false)
    }
  }, [orgId, isImpersonating])

  React.useEffect(() => {
    loadProcesses()
  }, [loadProcesses])

  // Load process types from database
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
    loadProcessTypes()
  }, [])

  // Load entities (use API when impersonating so RLS doesn't block)
  React.useEffect(() => {
    async function loadEntities() {
      if (!orgId) return
      try {
        const data = isImpersonating
          ? await getEntitiesForImpersonation(orgId)
          : await getEntities(orgId)
        setEntities(data)
      } catch (error) {
      } finally {
        setIsLoadingEntities(false)
      }
    }
    loadEntities()
  }, [orgId, isImpersonating])

  const handleProcessCreated = (newProcess: ProcessMapped) => {
    setProcesses((prev) => [newProcess, ...prev])
  }

  const handleProcessCreatedAndGoToGenerate = (newProcess: ProcessMapped) => {
    setProcesses((prev) => [newProcess, ...prev])
    setIsCreateDialogOpen(false)
    router.push(`/member/processes/${newProcess.id}/generate`)
  }

  const handleDeleteProcess = async () => {
    if (!selectedProcess) return
    try {
      setIsDeleting(true)
      await deleteProcessDB(selectedProcess.id)
      setProcesses((prev) => prev.filter((p) => p.id !== selectedProcess.id))
      setIsDeleteDialogOpen(false)
      setSelectedProcess(null)
    } catch (error) {
      console.error("Error deleting process:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateStatus = async (process: ProcessMapped, newStatus: string) => {
    if (process.status === newStatus) {
      return
    }

    try {
      setIsUpdatingStatus(true)
      const response = await fetch("/api/update-process", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          processId: process.id,
          status: newStatus,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        const errorMsg = responseData?.message || responseData?.error || "Error al actualizar el estado del proceso"
        throw new Error(errorMsg)
      }

      // Update local state
      setProcesses((prev) =>
        prev.map((p) =>
          p.id === process.id ? { ...p, status: newStatus as ProcessMapped["status"] } : p
        )
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar el estado del proceso"
      alert(errorMsg)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const getStatusOptions = (currentStatus: string) => {
    const allStatuses = [
      { value: "draft", label: "Borrador", icon: Pencil },
      { value: "in_progress", label: "En Progreso", icon: Play },
      { value: "review", label: "En Revisión", icon: Clock },
      { value: "completed", label: "Completado", icon: CheckCircle },
      { value: "archived", label: "Archivado", icon: Archive },
    ]
    return allStatuses.filter((s) => s.value !== currentStatus)
  }

  // Filter processes
  const filteredProcesses = processes.filter((process) => {
    const matchesSearch =
      searchQuery === "" ||
      process.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      process.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      process.secretaryName?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || process.status === statusFilter
    const matchesEntity = entityFilter === "all" || process.entityId === entityFilter
    const matchesProcessType = processTypeFilter === "all" || process.processTypeId === processTypeFilter

    return matchesSearch && matchesStatus && matchesEntity && matchesProcessType
  })

  // Calculate stats
  const stats = {
    total: processes.length,
    draft: processes.filter((p) => p.status === "draft").length,
    inProgress: processes.filter((p) => p.status === "in_progress").length,
    review: processes.filter((p) => p.status === "review").length,
    completed: processes.filter((p) => p.status === "completed").length,
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setEntityFilter("all")
    setProcessTypeFilter("all")
  }

  const hasActiveFilters =
    searchQuery || statusFilter !== "all" || entityFilter !== "all" || processTypeFilter !== "all"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mis Procesos"
        description={`Gestiona y monitorea todos tus procesos de contratación (${processes.length} procesos)`}
      >
        <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Proceso
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-5">
        <StatsCard title="Total Procesos" value={stats.total} description="Procesos registrados" icon={FolderKanban} />
        <StatsCard title="Borradores" value={stats.draft} description="Pendientes de iniciar" icon={FileText} />
        <StatsCard title="En Progreso" value={stats.inProgress} description="Procesos activos" icon={Clock} />
        <StatsCard title="En Revisión" value={stats.review} description="Pendientes de aprobación" icon={AlertCircle} />
        <StatsCard title="Completados" value={stats.completed} description="Procesos finalizados" icon={CheckCircle2} />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Filtros</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs">
                <X className="h-3 w-3" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, entidad o secretaría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProcessStatus)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="review">En Revisión</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="archived">Archivado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[200px]">
                <Building className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Entidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las entidades</SelectItem>
                {isLoadingEntities ? (
                  <SelectItem value="loading" disabled>
                    Cargando...
                  </SelectItem>
                ) : (
                  entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Select value={processTypeFilter} onValueChange={setProcessTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de proceso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {isLoadingTypes ? (
                  <SelectItem value="loading" disabled>
                    Cargando...
                  </SelectItem>
                ) : (
                  processTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Processes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Procesos</CardTitle>
          <CardDescription>
            {filteredProcesses.length} proceso(s) encontrado(s)
            {hasActiveFilters && " con los filtros aplicados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProcesses ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Secretaría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Docs</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FolderKanban className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No se encontraron procesos</p>
                        {hasActiveFilters && (
                          <Button variant="link" size="sm" onClick={clearFilters}>
                            Limpiar filtros
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcesses.map((process) => (
                    <TableRow key={process.id} className="group">
                      <TableCell className="font-mono text-sm font-medium">
                        <Link
                          href={`/member/documents?processId=${process.id}`}
                          className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                        >
                          {process.code}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {process.entityName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{process.secretaryName}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{process.processTypeName}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={process.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{process.documentsCount}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{process.updatedAt}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProcess(process)
                                setIsViewDialogOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/member/documents?processId=${process.id}`)}
                            >
                              <Files className="mr-2 h-4 w-4" />
                              Ver documentos del proceso
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/member/processes/${process.id}/generate`)}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Generar documentos
                            </DropdownMenuItem>
                            {process.spreadsheetUrl && (
                              <DropdownMenuItem
                                onClick={() => window.open(process.spreadsheetUrl!, "_blank")}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ver en Google Sheets
                              </DropdownMenuItem>
                            )}
                            {process.driveFolderUrl && (
                              <DropdownMenuItem
                                onClick={() => window.open(process.driveFolderUrl!, "_blank")}
                              >
                                <FolderKanban className="mr-2 h-4 w-4" />
                                Ver Carpeta en Drive
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {/* Status Change Options */}
                            {getStatusOptions(process.status).map((statusOption) => {
                              const Icon = statusOption.icon
                              return (
                                <DropdownMenuItem
                                  key={statusOption.value}
                                  onClick={() => handleUpdateStatus(process, statusOption.value)}
                                  disabled={isUpdatingStatus}
                                >
                                  <Icon className="mr-2 h-4 w-4" />
                                  Cambiar a {statusOption.label}
                                </DropdownMenuItem>
                              )
                            })}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedProcess(process)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Process Dialog */}
      <CreateProcessDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onProcessCreated={handleProcessCreated}
        onProcessCreatedAndGoToGenerate={handleProcessCreatedAndGoToGenerate}
      />

      {/* View Process Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm font-normal text-muted-foreground">{selectedProcess?.code}</span>
              Detalles del Proceso
            </DialogTitle>
          </DialogHeader>
          {selectedProcess && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Objeto del Proceso</h4>
                <p className="text-sm text-muted-foreground">{selectedProcess.object}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Descripción</h4>
                <p className="text-sm text-muted-foreground">{selectedProcess.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Entidad</h4>
                  <p className="text-sm text-muted-foreground">{selectedProcess.entityName}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Secretaría</h4>
                  <p className="text-sm text-muted-foreground">{selectedProcess.secretaryName}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Tipo de Proceso</h4>
                  <p className="text-sm text-muted-foreground">{selectedProcess.processTypeName}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Estado</h4>
                  <StatusBadge status={selectedProcess.status} />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Fecha de Creación</h4>
                  <p className="text-sm text-muted-foreground">{selectedProcess.createdAt}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Última Actualización</h4>
                  <p className="text-sm text-muted-foreground">{selectedProcess.updatedAt}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedProcess.documentsCount} documentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Versión {selectedProcess.currentVersion}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Cerrar
            </Button>
            {/*<Button>
              <Pencil className="mr-2 h-4 w-4" />
              Editar Proceso
            </Button>*/}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Proceso</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el proceso <strong>{selectedProcess?.code}</strong>? Esta acción no
              se puede deshacer y eliminará todos los documentos asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteProcess} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
