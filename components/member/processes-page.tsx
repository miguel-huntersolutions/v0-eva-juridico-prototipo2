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
import { mockProcesses, mockEntities, mockProcessTypes, type Process } from "@/lib/mock-data"
import { CreateProcessDialog } from "./create-process-dialog"

type ProcessStatus = "all" | "draft" | "in_progress" | "review" | "completed" | "archived"

export function ProcessesPage() {
  const [isCreateProcessOpen, setIsCreateProcessOpen] = React.useState(false)
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<ProcessStatus>("all")
  const [entityFilter, setEntityFilter] = React.useState<string>("all")
  const [processTypeFilter, setProcessTypeFilter] = React.useState<string>("all")
  const [activeTab, setActiveTab] = React.useState("all")

  // Get all processes for the organization
  const allProcesses = mockProcesses
  const entities = mockEntities.filter((e) => e.organizationId === "org-1")

  // Filter processes
  const filteredProcesses = React.useMemo(() => {
    return allProcesses.filter((proc) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        proc.object.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proc.description.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter from tabs
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "active" && (proc.status === "in_progress" || proc.status === "review")) ||
        (activeTab === "draft" && proc.status === "draft") ||
        (activeTab === "completed" && proc.status === "completed") ||
        (activeTab === "archived" && proc.status === "archived")

      // Additional status filter from dropdown
      const matchesStatus = statusFilter === "all" || proc.status === statusFilter

      // Entity filter
      const matchesEntity = entityFilter === "all" || proc.entityId === entityFilter

      // Process type filter
      const matchesProcessType = processTypeFilter === "all" || proc.processTypeId === processTypeFilter

      return matchesSearch && matchesTab && matchesStatus && matchesEntity && matchesProcessType
    })
  }, [allProcesses, searchQuery, activeTab, statusFilter, entityFilter, processTypeFilter])

  // Stats
  const stats = {
    total: allProcesses.length,
    active: allProcesses.filter((p) => p.status === "in_progress" || p.status === "review").length,
    draft: allProcesses.filter((p) => p.status === "draft").length,
    completed: allProcesses.filter((p) => p.status === "completed").length,
  }

  const handleViewProcess = (process: Process) => {
    setSelectedProcess(process)
    setIsDetailOpen(true)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setEntityFilter("all")
    setProcessTypeFilter("all")
  }

  const hasActiveFilters = statusFilter !== "all" || entityFilter !== "all" || processTypeFilter !== "all"

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <PageHeader
        title="Gestión de Procesos"
        description="Administra todos los procesos de contratación de tus entidades asignadas"
      >
        <Button onClick={() => setIsCreateProcessOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proceso
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Procesos"
          value={stats.total}
          description="En todas las entidades"
          icon={FolderKanban}
        />
        <StatsCard title="Activos" value={stats.active} description="En proceso o revisión" icon={Clock} />
        <StatsCard title="Borradores" value={stats.draft} description="Pendientes de iniciar" icon={AlertCircle} />
        <StatsCard
          title="Completados"
          value={stats.completed}
          description="Finalizados exitosamente"
          icon={CheckCircle2}
        />
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Lista de Procesos</CardTitle>
              <CardDescription>{filteredProcesses.length} procesos encontrados</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <TabsList>
                <TabsTrigger value="all" className="gap-2">
                  Todos
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {allProcesses.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="active" className="gap-2">
                  Activos
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {stats.active}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="draft" className="gap-2">
                  Borradores
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {stats.draft}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  Completados
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {stats.completed}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar procesos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-9"
                  />
                </div>

                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-48">
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
                  <SelectTrigger className="w-48">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {mockProcessTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>

            {/* Table Content */}
            <TabsContent value={activeTab} className="mt-4">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold">Código</TableHead>
                      <TableHead className="font-semibold">Objeto del Proceso</TableHead>
                      <TableHead className="font-semibold">Entidad</TableHead>
                      <TableHead className="font-semibold">Tipo</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Documentos</TableHead>
                      <TableHead className="font-semibold">Actualizado</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProcesses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <FolderKanban className="h-8 w-8 text-muted-foreground/50" />
                            <p>No se encontraron procesos</p>
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
                        <TableRow
                          key={process.id}
                          className="cursor-pointer"
                          onClick={() => handleViewProcess(process)}
                        >
                          <TableCell>
                            <span className="font-mono text-sm font-medium">{process.code}</span>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md">
                              <p className="font-medium truncate">{process.object}</p>
                              <p className="text-xs text-muted-foreground truncate">{process.secretaryName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{process.entityName}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {process.processTypeName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={process.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span>{process.documentsCount}</span>
                              <span className="text-xs text-muted-foreground">(V{process.currentVersion})</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {new Date(process.updatedAt).toLocaleDateString("es-CO")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" />
                                  Exportar Word
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Generar Nueva Versión
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

              {/* Pagination info */}
              {filteredProcesses.length > 0 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {filteredProcesses.length} de {allProcesses.length} procesos
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Process Dialog */}
      <CreateProcessDialog open={isCreateProcessOpen} onOpenChange={setIsCreateProcessOpen} entity={entities[0]} />

      {/* Process Detail Dialog */}
      <ProcessDetailDialog process={selectedProcess} open={isDetailOpen} onOpenChange={setIsDetailOpen} />
    </div>
  )
}

// Process Detail Dialog Component
interface ProcessDetailDialogProps {
  process: Process | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ProcessDetailDialog({ process, open, onOpenChange }: ProcessDetailDialogProps) {
  if (!process) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {process.code}
                <StatusBadge status={process.status} />
              </DialogTitle>
              <DialogDescription>{process.processTypeName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Object */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Objeto del Contrato</h4>
            <p className="text-sm">{process.object}</p>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Descripción</h4>
            <p className="text-sm">{process.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Entidad</h4>
              <p className="text-sm">{process.entityName}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Secretaría</h4>
              <p className="text-sm">{process.secretaryName}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Fecha de Creación</h4>
              <p className="text-sm">{new Date(process.createdAt).toLocaleDateString("es-CO")}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Última Actualización</h4>
              <p className="text-sm">{new Date(process.updatedAt).toLocaleDateString("es-CO")}</p>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Documentos</h4>
            <div className="flex items-center gap-4 rounded-lg border p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{process.documentsCount} documento(s) generado(s)</p>
                <p className="text-xs text-muted-foreground">Versión actual: V{process.currentVersion}</p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Editar Proceso
          </Button>
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            Generar Nueva Versión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
