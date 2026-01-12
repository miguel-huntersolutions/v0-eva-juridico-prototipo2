"use client"

import * as React from "react"
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
  type Entity,
  type ProcessMapped,
} from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"
import { CreateProcessDialog } from "./create-process-dialog"
import { GenerateDocumentsDialog } from "./generate-documents-dialog"

type ProcessStatus = "all" | "draft" | "in_progress" | "review" | "completed" | "archived"

export function ProcessesPage() {
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
  const [isGenerateDocumentsDialogOpen, setIsGenerateDocumentsDialogOpen] = React.useState(false)

  const [processTypes, setProcessTypes] = React.useState<ProcessType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = React.useState(true)

  const { profile } = useProfile()
  const [entities, setEntities] = React.useState<Entity[]>([])
  const [isLoadingEntities, setIsLoadingEntities] = React.useState(true)

  const loadProcesses = React.useCallback(async () => {
    if (!profile?.organization_id) return
    try {
      setIsLoadingProcesses(true)
      const data = await getProcessesMapped()
      setProcesses(data)
    } catch (error) {
      console.error("Error loading processes:", error)
    } finally {
      setIsLoadingProcesses(false)
    }
  }, [profile?.organization_id])

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

  // Load entities from database
  React.useEffect(() => {
    async function loadEntities() {
      if (!profile?.organization_id) return
      try {
        const data = await getEntities(profile.organization_id)
        setEntities(data)
      } catch (error) {
        console.error("Error loading entities:", error)
      } finally {
        setIsLoadingEntities(false)
      }
    }
    loadEntities()
  }, [profile?.organization_id])

  const handleProcessCreated = (newProcess: ProcessMapped) => {
    setProcesses((prev) => [newProcess, ...prev])
  }

  const [processDataToCreate, setProcessDataToCreate] = React.useState<{
    processData: any
    entity: Entity | null
    secretaryName: string
    processTypeName: string
  } | null>(null)

  const handleProcessCreatedAndReady = (processData: any, entity: Entity | null, secretaryName: string, processTypeName: string) => {
    // Store the process data to create later
    setProcessDataToCreate({
      processData,
      entity,
      secretaryName,
      processTypeName,
    })
    
    // Ensure the entity is in the entities list if it's not already there
    if (entity && !entities.find((e) => e.id === entity.id)) {
      setEntities((prev) => [...prev, entity])
    }
    
    // Open the generate documents dialog (process will be created at the end)
    setIsGenerateDocumentsDialogOpen(true)
  }

  const handleProcessCreatedFromDialog = (newProcess: ProcessMapped) => {
    // Add the new process to the list
    setProcesses((prev) => [newProcess, ...prev])
    setProcessDataToCreate(null)
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
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProcess(process)
                                setIsGenerateDocumentsDialogOpen(true)
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Generar Documentos
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
                            <DropdownMenuItem>
                              <Archive className="mr-2 h-4 w-4" />
                              Archivar
                            </DropdownMenuItem>
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
        onProcessCreatedAndReady={handleProcessCreatedAndReady}
      />

      {/* Generate Documents Dialog */}
      {(selectedProcess || processDataToCreate) && (
        <GenerateDocumentsDialog
          open={isGenerateDocumentsDialogOpen}
          onOpenChange={(open) => {
            setIsGenerateDocumentsDialogOpen(open)
            if (!open) {
              // Clear process data when closing
              setProcessDataToCreate(null)
              if (!isCreateDialogOpen) {
                setSelectedProcess(null)
              }
            }
          }}
          process={selectedProcess}
          processData={processDataToCreate?.processData || null}
          entity={selectedProcess 
            ? entities.find((e) => e.id === selectedProcess.entityId) || null
            : processDataToCreate?.entity || null}
          secretaryName={selectedProcess?.secretaryName || processDataToCreate?.secretaryName || ""}
          processTypeName={processDataToCreate?.processTypeName}
          onProcessCreated={handleProcessCreatedFromDialog}
          onDocumentsGenerated={loadProcesses}
        />
      )}

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
