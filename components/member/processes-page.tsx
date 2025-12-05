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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mockProcesses, mockEntities, type Process } from "@/lib/mock-data"
import { getProcessTypes, type ProcessType } from "@/lib/supabase/client-data-access"
import { CreateProcessDialog } from "./create-process-dialog"

type ProcessStatus = "all" | "draft" | "in_progress" | "review" | "completed" | "archived"

export function ProcessesPage() {
  const [processes, setProcesses] = React.useState(mockProcesses)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<ProcessStatus>("all")
  const [entityFilter, setEntityFilter] = React.useState<string>("all")
  const [processTypeFilter, setProcessTypeFilter] = React.useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false)

  const [processTypes, setProcessTypes] = React.useState<ProcessType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = React.useState(true)

  React.useEffect(() => {
    async function loadProcessTypes() {
      try {
        const types = await getProcessTypes()
        setProcessTypes(types)
      } catch (err) {
        console.error("Error loading process types:", err)
      } finally {
        setIsLoadingTypes(false)
      }
    }
    loadProcessTypes()
  }, [])

  const hasActiveFilters = statusFilter !== "all" || entityFilter !== "all" || processTypeFilter !== "all"

  const clearFilters = () => {
    setStatusFilter("all")
    setEntityFilter("all")
    setProcessTypeFilter("all")
  }

  const filteredProcesses = React.useMemo(() => {
    return processes.filter((process) => {
      const matchesSearch =
        searchQuery === "" ||
        process.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        process.object.toLowerCase().includes(searchQuery.toLowerCase()) ||
        process.entityName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || process.status === statusFilter
      const matchesEntity = entityFilter === "all" || process.entityId === entityFilter
      const matchesProcessType = processTypeFilter === "all" || process.processTypeId === processTypeFilter

      return matchesSearch && matchesStatus && matchesEntity && matchesProcessType
    })
  }, [processes, searchQuery, statusFilter, entityFilter, processTypeFilter])

  const stats = React.useMemo(() => {
    return {
      total: processes.length,
      draft: processes.filter((p) => p.status === "draft").length,
      inProgress: processes.filter((p) => p.status === "in_progress").length,
      review: processes.filter((p) => p.status === "review").length,
      completed: processes.filter((p) => p.status === "completed").length,
    }
  }, [processes])

  const handleViewProcess = (process: Process) => {
    setSelectedProcess(process)
    setIsViewDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader title="Mis Procesos" description="Gestiona los procesos de contratación de tus entidades">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proceso
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-5">
        <StatsCard title="Total Procesos" value={stats.total} description="Procesos registrados" icon={FolderKanban} />
        <StatsCard
          title="Borradores"
          value={stats.draft}
          description="Pendientes de iniciar"
          icon={FileText}
          variant="warning"
        />
        <StatsCard
          title="En Progreso"
          value={stats.inProgress}
          description="Procesos activos"
          icon={Clock}
          variant="info"
        />
        <StatsCard
          title="En Revisión"
          value={stats.review}
          description="Pendientes de aprobación"
          icon={AlertCircle}
          variant="warning"
        />
        <StatsCard
          title="Completados"
          value={stats.completed}
          description="Finalizados exitosamente"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Procesos de Contratación</CardTitle>
              <CardDescription>
                Lista de todos los procesos de contratación registrados en el sistema para tus entidades asignadas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, objeto o entidad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProcessStatus)}>
              <SelectTrigger className="w-[160px]">
                <Clock className="mr-2 h-4 w-4" />
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
                {mockEntities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={processTypeFilter} onValueChange={setProcessTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {isLoadingTypes ? (
                  <SelectItem value="loading" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Limpiar filtros
              </Button>
            )}
          </div>

          {/* Processes Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Objeto</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Docs</TableHead>
                  <TableHead className="text-right">Actualización</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FolderKanban className="mb-2 h-8 w-8" />
                        <p>No se encontraron procesos</p>
                        {hasActiveFilters && (
                          <Button variant="link" size="sm" onClick={clearFilters} className="mt-1">
                            Limpiar filtros
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcesses.map((process) => (
                    <TableRow key={process.id} className="group">
                      <TableCell className="font-medium">
                        <Badge variant="outline" className="font-mono">
                          {process.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <p className="truncate font-medium">{process.object}</p>
                          <p className="truncate text-xs text-muted-foreground">{process.secretaryName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{process.entityName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {process.processTypeName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={process.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {process.documentsCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(process.updatedAt).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewProcess(process)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Exportar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Archive className="mr-2 h-4 w-4" />
                              Archivar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
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
          </div>
        </CardContent>
      </Card>

      {/* Create Process Dialog */}
      <CreateProcessDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

      {/* View Process Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {selectedProcess?.code}
              </Badge>
              <span className="text-muted-foreground">|</span>
              <StatusBadge status={selectedProcess?.status || "draft"} />
            </DialogTitle>
            <DialogDescription>{selectedProcess?.object}</DialogDescription>
          </DialogHeader>
          {selectedProcess && (
            <div className="space-y-6 py-4">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Información</TabsTrigger>
                  <TabsTrigger value="documents">Documentos ({selectedProcess.documentsCount})</TabsTrigger>
                  <TabsTrigger value="history">Historial</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Entidad</p>
                      <p className="font-medium">{selectedProcess.entityName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Secretaría</p>
                      <p className="font-medium">{selectedProcess.secretaryName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Tipo de Proceso</p>
                      <Badge variant="secondary">{selectedProcess.processTypeName}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Versión Actual</p>
                      <Badge variant="outline">v{selectedProcess.currentVersion}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                    <p className="text-sm">{selectedProcess.description}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Fecha de Creación</p>
                      <p className="text-sm">
                        {new Date(selectedProcess.createdAt).toLocaleDateString("es-CO", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Última Actualización</p>
                      <p className="text-sm">
                        {new Date(selectedProcess.updatedAt).toLocaleDateString("es-CO", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="documents" className="pt-4">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="mb-2 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {selectedProcess.documentsCount} documento(s) asociado(s)
                    </p>
                    <Button variant="outline" size="sm" className="mt-4 bg-transparent">
                      Ver Documentos
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="history" className="pt-4">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="mb-2 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Historial de cambios no disponible</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Cerrar
            </Button>
            <Button>
              <Pencil className="mr-2 h-4 w-4" />
              Editar Proceso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
