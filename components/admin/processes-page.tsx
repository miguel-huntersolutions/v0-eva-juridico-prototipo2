"use client"

import * as React from "react"
import Link from "next/link"
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
  UserPlus,
  Users,
  CalendarClock,
  MessageSquareText,
  ScrollText,
  Download,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatsCard } from "@/components/stats-card"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  getOrganizationMembers,
  deleteProcess as deleteProcessDB,
  type ProcessType,
  type EntityMapped,
  type ProcessMapped,
} from "@/lib/supabase/client-data-access"
import { ProcessStagesDialog } from "@/components/member/process-stages-dialog"
import { ProcessThreadDialog } from "@/components/member/process-thread-dialog"
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
  const [assignProcess, setAssignProcess] = React.useState<ProcessMapped | null>(null)
  const [assigneeSelection, setAssigneeSelection] = React.useState("none")
  const [isAssigning, setIsAssigning] = React.useState(false)
  const [assignError, setAssignError] = React.useState<string | null>(null)
  const [members, setMembers] = React.useState<Array<{ id: string; name: string; email: string; role: string }>>([])
  const [assigneeFilter, setAssigneeFilter] = React.useState("all")
  const [stageFilter, setStageFilter] = React.useState<"all" | "overdue">("all")
  const [stagesProcess, setStagesProcess] = React.useState<ProcessMapped | null>(null)
  const [threadProcess, setThreadProcess] = React.useState<ProcessMapped | null>(null)
  const [unreadByProcess, setUnreadByProcess] = React.useState<Record<string, number>>({})
  const [auditProcess, setAuditProcess] = React.useState<ProcessMapped | null>(null)
  const [auditEvents, setAuditEvents] = React.useState<
    Array<{
      id: string
      actionLabel: string
      actorName: string
      details: Record<string, unknown> | null
      createdAt: string
    }>
  >([])
  const [isLoadingAudit, setIsLoadingAudit] = React.useState(false)
  const [stagesSummary, setStagesSummary] = React.useState<
    Record<string, { nextStageLabel: string; nextStageDate: string; daysUntil: number; overdueCount: number }>
  >({})

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

  React.useEffect(() => {
    if (!effectiveOrganizationId || !orgLoaded) return
    let cancelled = false
    getOrganizationMembers(effectiveOrganizationId)
      .then((list) => {
        if (cancelled) return
        setMembers(
          (list || [])
            .filter((m) => m.role === "member" || m.role === "admin")
            .map((m) => ({ id: m.id, name: m.name || m.email, email: m.email, role: m.role })),
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [effectiveOrganizationId, orgLoaded])

  React.useEffect(() => {
    if (processes.length === 0) {
      setStagesSummary({})
      return
    }
    let cancelled = false
    fetch("/api/processes/stages-summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.summary) setStagesSummary(data.summary)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [processes])

  const loadUnread = React.useCallback(() => {
    fetch("/api/processes/workspace-meta")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.unreadByProcess) setUnreadByProcess(data.unreadByProcess)
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (processes.length === 0) return
    loadUnread()
  }, [processes, loadUnread])

  const openAuditDialog = async (process: ProcessMapped) => {
    setAuditProcess(process)
    setAuditEvents([])
    setIsLoadingAudit(true)
    try {
      const res = await fetch(`/api/audit?processId=${process.id}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el registro")
      setAuditEvents(data.events || [])
    } catch (err) {
      console.error("Error loading audit:", err)
      setAuditEvents([])
    } finally {
      setIsLoadingAudit(false)
    }
  }

  const openThread = (process: ProcessMapped) => {
    setThreadProcess(process)
    if ((unreadByProcess[process.id] || 0) > 0) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processId: process.id, type: "thread_message" }),
      }).catch(() => {})
      setUnreadByProcess((prev) => ({ ...prev, [process.id]: 0 }))
    }
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
    const matchesAssignee =
      assigneeFilter === "all" ||
      (assigneeFilter === "unassigned" ? !process.assignedToId : process.assignedToId === assigneeFilter)
    const matchesStage = stageFilter === "all" || (stagesSummary[process.id]?.overdueCount ?? 0) > 0

    return matchesSearch && matchesStatus && matchesEntity && matchesType && matchesAssignee && matchesStage
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
    setAssigneeFilter("all")
    setStageFilter("all")
  }

  const hasActiveFilters =
    statusFilter !== "all" ||
    entityFilter !== "all" ||
    processTypeFilter !== "all" ||
    assigneeFilter !== "all" ||
    stageFilter !== "all"

  const overdueProcessCount = processes.filter((p) => (stagesSummary[p.id]?.overdueCount ?? 0) > 0).length

  const stageBadge = (p: ProcessMapped) => {
    const s = stagesSummary[p.id]
    if (!s) return <span className="text-sm text-muted-foreground">Sin fechas</span>
    if (s.overdueCount > 0) {
      return (
        <Badge variant="destructive" className="text-xs" title={`${s.overdueCount} etapa(s) vencida(s) sin cumplir`}>
          <CalendarClock className="mr-1 h-3 w-3" />
          {s.overdueCount} vencida{s.overdueCount > 1 ? "s" : ""}
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="text-xs"
        title={`Próxima etapa: ${s.nextStageLabel} (${s.nextStageDate})`}
      >
        <CalendarClock className="mr-1 h-3 w-3" />
        {s.nextStageLabel}: {s.daysUntil === 0 ? "hoy" : s.daysUntil === 1 ? "mañana" : `${s.daysUntil} días`}
      </Badge>
    )
  }

  const openAssignDialog = (process: ProcessMapped) => {
    setAssignProcess(process)
    setAssigneeSelection(process.assignedToId || "none")
    setAssignError(null)
  }

  const handleAssign = async () => {
    if (!assignProcess) return
    try {
      setIsAssigning(true)
      setAssignError(null)
      const res = await fetch(`/api/processes/${assignProcess.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: assigneeSelection === "none" ? null : assigneeSelection }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "No se pudo asignar el proceso")
      setProcesses((prev) =>
        prev.map((p) =>
          p.id === assignProcess.id
            ? {
                ...p,
                assignedToId: data.assignedTo,
                assignedToName: data.assigneeName,
                assignedAt: new Date().toISOString(),
              }
            : p,
        ),
      )
      setAssignProcess(null)
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Error al asignar el proceso")
    } finally {
      setIsAssigning(false)
    }
  }

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
        <StatsCard title="Total Procesos" value={stats.total} description="Procesos registrados" icon={FolderKanban} />
        <StatsCard title="Borradores" value={stats.draft} description="En edición" icon={Pencil} />
        <StatsCard title="En Progreso" value={stats.inProgress} description="Procesos activos" icon={Clock} />
        <StatsCard title="En Revisión" value={stats.review} description="Pendientes de revisión" icon={AlertCircle} />
        <StatsCard title="Completados" value={stats.completed} description="Procesos finalizados" icon={CheckCircle2} />
        <StatsCard title="Archivados" value={stats.archived} description="Procesos archivados" icon={Archive} />
        <StatsCard
          title="Con etapas vencidas"
          value={overdueProcessCount}
          description="Cronograma atrasado"
          icon={CalendarClock}
        />
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
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[200px]">
                <Users className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los responsables</SelectItem>
                <SelectItem value="unassigned">Sin responsable</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={(value) => setStageFilter(value as "all" | "overdue")}>
              <SelectTrigger className="w-[200px]">
                <CalendarClock className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Cronograma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el cronograma</SelectItem>
                <SelectItem value="overdue">Solo con etapas vencidas</SelectItem>
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
                  <TableHead>Responsable</TableHead>
                  <TableHead>Cronograma</TableHead>
                  <TableHead className="text-center">Docs</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <p className="text-muted-foreground">No se encontraron procesos</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcesses.map((process) => (
                    <TableRow key={process.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        <Link
                          href={`/admin/documents?processId=${process.id}`}
                          className="text-primary hover:underline"
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
                      <TableCell>
                        {process.assignedToName ? (
                          <span className="text-sm">{process.assignedToName}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => setStagesProcess(process)}
                        >
                          {stageBadge(process)}
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/admin/documents?processId=${process.id}`}>
                          <Badge variant="secondary" className="cursor-pointer hover:opacity-80">{process.documentsCount}</Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{process.updatedAt}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="relative h-8 w-8"
                          title={
                            (unreadByProcess[process.id] || 0) > 0
                              ? `${unreadByProcess[process.id]} mensaje(s) nuevo(s)`
                              : "Hilo de comunicación"
                          }
                          onClick={() => openThread(process)}
                        >
                          <MessageSquareText className="h-4 w-4" />
                          {(unreadByProcess[process.id] || 0) > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                              {unreadByProcess[process.id] > 9 ? "9+" : unreadByProcess[process.id]}
                            </span>
                          )}
                        </Button>
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
                            <DropdownMenuItem onClick={() => openAssignDialog(process)}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              {process.assignedToId ? "Reasignar responsable" : "Asignar responsable"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStagesProcess(process)}>
                              <CalendarClock className="mr-2 h-4 w-4" />
                              Ver y editar cronograma
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openThread(process)}>
                              <MessageSquareText className="mr-2 h-4 w-4" />
                              {(unreadByProcess[process.id] || 0) > 0
                                ? `Hilo de comunicación (${unreadByProcess[process.id]} nuevos)`
                                : "Hilo de comunicación"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAuditDialog(process)}>
                              <ScrollText className="mr-2 h-4 w-4" />
                              Registro de auditoría
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
                        </div>
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
                  <p className="text-sm font-medium text-muted-foreground">Responsable</p>
                  <p className="text-sm">{selectedProcess.assignedToName || "Sin asignar"}</p>
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

      <Dialog open={!!assignProcess} onOpenChange={(open) => !open && setAssignProcess(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar responsable</DialogTitle>
            <DialogDescription>
              Proceso <strong>{assignProcess?.code}</strong> · {assignProcess?.entityName}. Solo asesores o
              administradores de la firma. No se puede asignar a un funcionario de entidad.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="admin-assignee-select">Responsable</Label>
            <Select value={assigneeSelection} onValueChange={setAssigneeSelection}>
              <SelectTrigger id="admin-assignee-select">
                <SelectValue placeholder="Selecciona un miembro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin responsable</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.email} ({m.role === "admin" ? "admin" : "asesor"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {assignError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignProcess(null)} disabled={isAssigning}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={isAssigning}>
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Guardar asignación
                </>
              )}
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

      <Dialog open={!!auditProcess} onOpenChange={(open) => !open && setAuditProcess(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registro de auditoría</DialogTitle>
            <DialogDescription>
              Eventos del proceso <strong>{auditProcess?.code}</strong>. El registro es inalterable.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {isLoadingAudit ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : auditEvents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay eventos registrados para este proceso.
              </p>
            ) : (
              <ul className="space-y-2 py-2">
                {auditEvents.map((ev) => (
                  <li key={ev.id} className="rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{ev.actionLabel}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{ev.createdAt}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ev.actorName}
                      {ev.details && Object.keys(ev.details).length > 0
                        ? ` · ${Object.entries(ev.details)
                            .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
                            .join(" · ")}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/audit?processId=${auditProcess?.id}&format=csv`, "_blank")}
              disabled={auditEvents.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => setAuditProcess(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProcessThreadDialog
        processId={threadProcess?.id ?? null}
        processCode={threadProcess?.code}
        open={!!threadProcess}
        onOpenChange={(open) => {
          if (!open) {
            setThreadProcess(null)
            loadUnread()
          }
        }}
      />

      <ProcessStagesDialog
        processId={stagesProcess?.id ?? null}
        processCode={stagesProcess?.code}
        open={!!stagesProcess}
        onOpenChange={(open) => {
          if (!open) {
            setStagesProcess(null)
            fetch("/api/processes/stages-summary")
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (data?.summary) setStagesSummary(data.summary)
              })
              .catch(() => {})
          }
        }}
      />
    </div>
  )
}

