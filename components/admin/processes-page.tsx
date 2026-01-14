"use client"

import * as React from "react"
import {
  FolderKanban,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Pencil,
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
  getProcessesMapped,
  deleteProcess as deleteProcessDB,
  type ProcessType,
  type EntityMapped,
  type ProcessMapped,
} from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"
import { useOrganizationSelector } from "@/hooks/use-organization-selector"
import { useRoleSwitcher } from "@/hooks/use-role-switcher"

type ProcessStatus = "all" | "draft" | "in_progress" | "review" | "completed" | "archived"

export function ProcessesPage() {
  const { profile } = useProfile()
  const { actualRole } = useRoleSwitcher(profile?.role)
  const isSuperadmin = actualRole === "superadmin"
  const {
    effectiveOrganizationId,
    isLoaded: orgLoaded,
  } = useOrganizationSelector({
    userOrganizationId: profile?.organization_id,
    isSuperadmin,
    isSimulatingAdmin: false,
  })

  const [processes, setProcesses] = React.useState<ProcessMapped[]>([])
  const [isLoadingProcesses, setIsLoadingProcesses] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<ProcessStatus>("all")
  const [entityFilter, setEntityFilter] = React.useState<string>("all")
  const [processTypeFilter, setProcessTypeFilter] = React.useState<string>("all")
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
    if (!effectiveOrganizationId || !orgLoaded) {
      setIsLoadingProcesses(false)
      return
    }
    try {
      setIsLoadingProcesses(true)
      const allProcesses = await getProcessesMapped()
      
      // Filter processes by organization entities
      const orgEntities = await getEntities(effectiveOrganizationId)
      const entityIds = orgEntities.map((e) => e.id)
      const filteredProcesses = allProcesses.filter((p) => entityIds.includes(p.entityId))
      
      setProcesses(filteredProcesses)
      console.log("[AdminProcessesPage] Total processes:", allProcesses.length, "Organization processes:", filteredProcesses.length)
    } catch (error) {
      console.error("Error loading processes:", error)
    } finally {
      setIsLoadingProcesses(false)
    }
  }, [effectiveOrganizationId, orgLoaded])

  React.useEffect(() => {
    loadProcesses()
  }, [loadProcesses])

  // Load process types
  React.useEffect(() => {
    async function loadTypes() {
      try {
        setIsLoadingTypes(true)
        const types = await getProcessTypes()
        setProcessTypes(types)
      } catch (error) {
        console.error("Error loading process types:", error)
      } finally {
        setIsLoadingTypes(false)
      }
    }
    loadTypes()
  }, [])

  // Load entities
  React.useEffect(() => {
    async function loadEntities() {
      if (!effectiveOrganizationId || !orgLoaded) return
      try {
        setIsLoadingEntities(true)
        const data = await getEntities(effectiveOrganizationId)
        setEntities(data)
      } catch (error) {
        console.error("Error loading entities:", error)
      } finally {
        setIsLoadingEntities(false)
      }
    }
    if (effectiveOrganizationId && orgLoaded) {
      loadEntities()
    }
  }, [effectiveOrganizationId, orgLoaded])

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
      alert("Error al eliminar el proceso")
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
      console.error("Error updating process status:", err)
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
      process.object.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || process.status === statusFilter
    const matchesEntity = entityFilter === "all" || process.entityId === entityFilter
    const matchesType = processTypeFilter === "all" || process.processTypeId === processTypeFilter

    return matchesSearch && matchesStatus && matchesEntity && matchesType
  })

  // Stats
  const stats = {
    total: processes.length,
    draft: processes.filter((p) => p.status === "draft").length,
    inProgress: processes.filter((p) => p.status === "in_progress").length,
    review: processes.filter((p) => p.status === "review").length,
    completed: processes.filter((p) => p.status === "completed").length,
    archived: processes.filter((p) => p.status === "archived").length,
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setEntityFilter("all")
    setProcessTypeFilter("all")
  }

  const hasActiveFilters =
    statusFilter !== "all" || entityFilter !== "all" || processTypeFilter !== "all"

  if (isLoadingProcesses || !orgLoaded) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <PageHeader
        title="Gestión de Procesos"
        description={`Gestiona y monitorea todos los procesos de contratación de la organización (${processes.length} procesos)`}
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatsCard title="Total Procesos" value={stats.total} description="Procesos registrados" icon={FolderKanban} />
        <StatsCard title="Borradores" value={stats.draft} description="En edición" icon={Pencil} />
        <StatsCard title="En Progreso" value={stats.inProgress} description="Procesos activos" icon={Clock} />
        <StatsCard title="En Revisión" value={stats.review} description="Pendientes de revisión" icon={AlertCircle} />
        <StatsCard title="Completados" value={stats.completed} description="Procesos finalizados" icon={CheckCircle2} />
        <StatsCard title="Archivados" value={stats.archived} description="Procesos archivados" icon={Archive} />
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o objeto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProcessStatus)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
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
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={processTypeFilter} onValueChange={setProcessTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <FolderKanban className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {processTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
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
                    <TableCell colSpan={8} className="h-24 text-center">
                      <p className="text-muted-foreground">No se encontraron procesos</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcesses.map((process) => (
                    <TableRow key={process.id}>
                      <TableCell className="font-mono text-sm font-medium">{process.code}</TableCell>
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

      {/* View Process Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProcess?.code}</DialogTitle>
            <DialogDescription>Detalles del proceso</DialogDescription>
          </DialogHeader>
          {selectedProcess && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Entidad</p>
                  <p className="text-sm">{selectedProcess.entityName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Secretaría</p>
                  <p className="text-sm">{selectedProcess.secretaryName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <p className="text-sm">{selectedProcess.processTypeName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <StatusBadge status={selectedProcess.status} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Documentos</p>
                  <p className="text-sm">{selectedProcess.documentsCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Versión</p>
                  <p className="text-sm">V{selectedProcess.currentVersion}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Objeto del Proceso</p>
                <p className="text-sm">{selectedProcess.object}</p>
              </div>
              {selectedProcess.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                  <p className="text-sm">{selectedProcess.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Process Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Proceso</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el proceso "{selectedProcess?.code}"? Esta acción no se puede
              deshacer.
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
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

