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
  Sparkles,
  Copy,
  UserPlus,
  ScrollText,
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
import { Label } from "@/components/ui/label"
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
  getOrganizationMembers,
  type ProcessType,
  type EntityMapped,
  type ProcessMapped,
} from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import { CreateProcessDialog } from "./create-process-dialog"
import { type ProcessData } from "./generate-documents-dialog"

type ProcessStatus = "all" | "draft" | "in_progress" | "review" | "completed" | "archived"

function getStatusOptions(currentStatus: string) {
  const allStatuses = [
    { value: "draft", label: "Borrador", icon: Pencil },
    { value: "in_progress", label: "En Progreso", icon: Play },
    { value: "review", label: "En Revisión", icon: Clock },
    { value: "completed", label: "Completado", icon: CheckCircle },
    { value: "archived", label: "Archivado", icon: Archive },
  ]
  return allStatuses.filter((s) => s.value !== currentStatus)
}

function ProcessActionsMenu({
  process,
  isUpdatingStatus,
  onView,
  onDelete,
  onUpdateStatus,
  onReuse,
  progressLabel,
  isAdmin,
  onAssign,
  onViewAudit,
}: {
  process: ProcessMapped
  isUpdatingStatus: boolean
  onView: () => void
  onDelete: () => void
  onUpdateStatus: (status: string) => void
  onReuse: () => void
  /** CAP-02: si la generación está incompleta, texto de progreso (ej. "3/9") */
  progressLabel?: string
  /** CAP-08/09: solo admin puede asignar responsables y ver la auditoría */
  isAdmin?: boolean
  onAssign?: () => void
  onViewAudit?: () => void
}) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            onView()
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver detalles
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/member/documents?processId=${process.id}`)
          }}
        >
          <Files className="mr-2 h-4 w-4" />
          Ver documentos del proceso
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/member/processes/${process.id}/generate`)
          }}
        >
          <Play className="mr-2 h-4 w-4" />
          {process.status === "draft"
            ? `Continuar diligenciamiento${progressLabel ? ` (${progressLabel})` : ""}`
            : "Generar documentos"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/member/processes/${process.id}/generate-smart`)
          }}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generar con IA (contexto)
        </DropdownMenuItem>
        {/* RF-012 (CAP-03): reutilizar proceso */}
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            onReuse()
          }}
        >
          <Copy className="mr-2 h-4 w-4" />
          Reutilizar proceso
        </DropdownMenuItem>
        {/* CAP-08 (RF-028): asignar responsable — solo admin (CA-028.4) */}
        {isAdmin && onAssign && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onAssign()
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {process.assignedToId ? "Reasignar responsable" : "Asignar responsable"}
          </DropdownMenuItem>
        )}
        {/* CAP-09 (RF-031): registro de auditoría — solo admin (CA-031.3) */}
        {isAdmin && onViewAudit && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onViewAudit()
            }}
          >
            <ScrollText className="mr-2 h-4 w-4" />
            Registro de auditoría
          </DropdownMenuItem>
        )}
        {process.spreadsheetUrl && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              window.open(process.spreadsheetUrl!, "_blank")
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver en Google Sheets
          </DropdownMenuItem>
        )}
        {process.driveFolderUrl && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              window.open(process.driveFolderUrl!, "_blank")
            }}
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            Ver Carpeta en Drive
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {getStatusOptions(process.status).map((statusOption) => {
          const Icon = statusOption.icon
          return (
            <DropdownMenuItem
              key={statusOption.value}
              onClick={(e) => {
                e.stopPropagation()
                onUpdateStatus(statusOption.value)
              }}
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
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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

  // CAP-08: asignación de responsable (solo admin) + filtro por responsable (RF-030)
  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin"
  const [members, setMembers] = React.useState<Array<{ id: string; name: string; email: string }>>([])
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>("all")
  const [assignProcess, setAssignProcess] = React.useState<ProcessMapped | null>(null)
  const [assigneeSelection, setAssigneeSelection] = React.useState<string>("")
  const [isAssigning, setIsAssigning] = React.useState(false)
  const [assignError, setAssignError] = React.useState<string | null>(null)

  // CAP-09: registro de auditoría del proceso (solo admin)
  const [auditProcess, setAuditProcess] = React.useState<ProcessMapped | null>(null)
  const [auditEvents, setAuditEvents] = React.useState<Array<{
    id: string
    actionLabel: string
    actorName: string
    details: Record<string, unknown> | null
    ip: string | null
    createdAt: string
  }>>([])
  const [isLoadingAudit, setIsLoadingAudit] = React.useState(false)

  // Load process types once on mount (no org dependency)
  React.useEffect(() => {
    let cancelled = false
    getProcessTypes()
      .then((types) => {
        if (!cancelled) setProcessTypes(types)
      })
      .catch((error) => console.error("Error loading process types:", error))
      .finally(() => {
        if (!cancelled) setIsLoadingTypes(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Load processes and entities in parallel as soon as orgId is available
  React.useEffect(() => {
    if (!orgId) {
      setIsLoadingProcesses(false)
      setIsLoadingEntities(false)
      return
    }
    let cancelled = false
    setIsLoadingProcesses(true)
    setIsLoadingEntities(true)
    const loadProcesses = isImpersonating
      ? getProcessesForImpersonation(orgId)
      : getProcessesMapped()
    const loadEntities = isImpersonating
      ? getEntitiesForImpersonation(orgId)
      : getEntities(orgId)
    Promise.all([loadProcesses, loadEntities])
      .then(([processesData, entitiesData]) => {
        if (!cancelled) {
          setProcesses(processesData)
          setEntities(entitiesData)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setIsLoadingProcesses(false)
          setIsLoadingEntities(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [orgId, isImpersonating])

  // CAP-08: cargar miembros de la org para el selector de responsable (solo admin)
  React.useEffect(() => {
    if (!orgId || !isAdmin) return
    let cancelled = false
    getOrganizationMembers(orgId)
      .then((list: any[]) => {
        if (cancelled) return
        setMembers(
          (list || [])
            .filter((m) => m.role !== "superadmin")
            .map((m) => ({ id: m.id, name: m.name || m.full_name || m.email, email: m.email })),
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [orgId, isAdmin])

  const handleProcessCreated = (newProcess: ProcessMapped) => {
    setProcesses((prev) => [newProcess, ...prev])
  }

  // Flujo "Crear y generar": NO se crea el proceso en BD aquí. Se navega a la
  // pantalla independiente /processes/new/generate con los datos en sessionStorage;
  // el proceso solo se persiste al generar el primer documento o guardar borrador.
  // Si el usuario sale sin hacer nada, no queda ningún borrador vacío.
  const handleProcessReadyToGenerate = (
    processData: ProcessData,
    entity: EntityMapped | null,
    secretaryName: string,
    processTypeName: string,
  ) => {
    setIsCreateDialogOpen(false)
    try {
      sessionStorage.setItem(
        "eva:new-process-draft",
        JSON.stringify({
          processData,
          entity: entity ? { id: entity.id, name: entity.name } : null,
          secretaryName,
          processTypeName,
        }),
      )
    } catch {
      // sessionStorage no disponible: la página destino redirigirá a /processes
    }
    router.push("/member/processes/new/generate")
  }

  const reloadProcesses = React.useCallback(async () => {
    if (!orgId) return
    try {
      const data = isImpersonating ? await getProcessesForImpersonation(orgId) : await getProcessesMapped()
      setProcesses(data)
    } catch {
      // silencioso
    }
  }, [orgId, isImpersonating])

  // CAP-02: progreso de generación por proceso (plantillas con doc / total del tipo).
  // Define si se muestra "Continuar" y el texto con el avance ("Continuar 3/9").
  const [generationProgress, setGenerationProgress] = React.useState<
    Record<string, { generated: number; total: number }>
  >({})

  React.useEffect(() => {
    if (processes.length === 0) {
      setGenerationProgress({})
      return
    }
    let cancelled = false
    fetch("/api/processes/generation-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processIds: processes.map((p) => p.id) }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.progress) setGenerationProgress(data.progress)
      })
      .catch(() => {
        // sin progreso: simplemente no se muestra el detalle
      })
    return () => {
      cancelled = true
    }
  }, [processes])

  /** "Continuar" solo aplica a procesos en BORRADOR: son los que aún están en
      diligenciamiento/generación. Al generar todas las plantillas el proceso pasa
      a "En progreso" automáticamente y el acceso directo desaparece. */
  const isGenerationIncomplete = (p: ProcessMapped) => {
    if (p.status !== "draft") return false
    const prog = generationProgress[p.id]
    if (!prog || prog.total === 0) return true // borrador sin info de progreso: continuar
    return prog.generated < prog.total
  }

  /** Texto del acceso directo de continuación con progreso, ej. "Continuar 3/9". */
  const continueLabel = (p: ProcessMapped) => {
    const prog = generationProgress[p.id]
    if (prog && prog.total > 0 && prog.generated > 0) {
      return `Continuar ${prog.generated}/${prog.total}`
    }
    return "Continuar"
  }

  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const handleDeleteProcess = async () => {
    if (!selectedProcess) return
    try {
      setIsDeleting(true)
      setDeleteError(null)
      // El borrado va por API (service role): con RLS del browser, un member
      // borraba 0 filas SIN error y el proceso reaparecía al recargar.
      const res = await fetch(`/api/processes/${selectedProcess.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "No se pudo eliminar el proceso")
      }
      setProcesses((prev) => prev.filter((p) => p.id !== selectedProcess.id))
      setIsDeleteDialogOpen(false)
      setSelectedProcess(null)
    } catch (error) {
      console.error("Error deleting process:", error)
      // Error visible: antes se tragaba y la UI mentía (quitaba el proceso solo en memoria)
      setDeleteError(error instanceof Error ? error.message : "Error al eliminar el proceso")
    } finally {
      setIsDeleting(false)
    }
  }

  // CAP-08 (RF-028): asignar/reasignar responsable (solo admin). La API otorga
  // acceso a la entidad si no lo tenía y deja todo en auditoría.
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
      // Actualizar la lista local
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

  // CAP-09 (RF-031): abrir el registro de auditoría del proceso (solo admin)
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

  // RF-012 (CAP-03): reutilizar proceso → crea borrador con campos precargados.
  const [isReusing, setIsReusing] = React.useState(false)
  const handleReuse = async (process: ProcessMapped) => {
    if (isReusing) return
    try {
      setIsReusing(true)
      const res = await fetch(`/api/processes/${process.id}/reuse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al reutilizar el proceso")
      // Ir al formulario del nuevo proceso con los campos precargados.
      router.push(`/member/processes/${data.process.id}/generate?reused=1`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al reutilizar el proceso")
    } finally {
      setIsReusing(false)
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
    // CAP-08 (RF-030): filtrable por responsable
    const matchesAssignee =
      assigneeFilter === "all" ||
      (assigneeFilter === "unassigned" ? !process.assignedToId : process.assignedToId === assigneeFilter)

    return matchesSearch && matchesStatus && matchesEntity && matchesProcessType && matchesAssignee
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

  const emptyState = (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <FolderKanban className="h-8 w-8 text-muted-foreground" />
      <p className="text-muted-foreground">No se encontraron procesos</p>
      {hasActiveFilters && (
        <Button variant="link" size="sm" onClick={clearFilters}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Mis Procesos"
        description={`Gestiona y monitorea todos tus procesos de contratación (${processes.length} procesos)`}
      >
        <Button className="w-full gap-2 sm:w-auto" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Proceso
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard title="Total Procesos" value={stats.total} description="Procesos registrados" icon={FolderKanban} />
        <StatsCard title="Borradores" value={stats.draft} description="Pendientes de iniciar" icon={FileText} />
        <StatsCard title="En Progreso" value={stats.inProgress} description="Procesos activos" icon={Clock} />
        <StatsCard title="En Revisión" value={stats.review} description="Pendientes de aprobación" icon={AlertCircle} />
        <StatsCard title="Completados" value={stats.completed} description="Procesos finalizados" icon={CheckCircle2} />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
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
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="relative w-full sm:min-w-[200px] sm:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, entidad o secretaría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProcessStatus)}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
              <SelectTrigger className="w-full sm:w-[200px]">
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
              <SelectTrigger className="w-full sm:w-[200px]">
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
            {/* CAP-08 (RF-030): filtro por responsable — solo admin */}
            {isAdmin && (
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Responsable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los responsables</SelectItem>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processes list */}
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
          ) : filteredProcesses.length === 0 ? (
            emptyState
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filteredProcesses.map((process) => (
                  <div
                    key={process.id}
                    className="rounded-lg border bg-card p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FolderKanban className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link
                          href={`/member/documents?processId=${process.id}`}
                          className="block truncate font-mono text-sm font-medium text-primary hover:underline"
                        >
                          {process.code}
                        </Link>
                        <p className="truncate text-sm">{process.entityName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {process.secretaryName}
                          {process.processTypeName ? ` · ${process.processTypeName}` : ""}
                        </p>
                        {/* CAP-08 (RF-030): responsable asignado */}
                        {process.assignedToName && (
                          <p className="truncate text-xs text-muted-foreground">
                            Responsable: {process.assignedToName}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <StatusBadge status={process.status} />
                          <Badge variant="secondary">{process.documentsCount} docs</Badge>
                          <span className="text-xs text-muted-foreground">{process.updatedAt}</span>
                          {/* CAP-02: "Continuar" solo en borradores */}
                          {isGenerationIncomplete(process) && (
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => router.push(`/member/processes/${process.id}/generate`)}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              {continueLabel(process)}
                            </Button>
                          )}
                        </div>
                      </div>
                      <ProcessActionsMenu
                        process={process}
                        isUpdatingStatus={isUpdatingStatus}
                        onView={() => {
                          setSelectedProcess(process)
                          setIsViewDialogOpen(true)
                        }}
                        onDelete={() => {
                          setSelectedProcess(process)
                          setDeleteError(null)
                          setIsDeleteDialogOpen(true)
                        }}
                        onUpdateStatus={(status) => handleUpdateStatus(process, status)}
                        onReuse={() => handleReuse(process)}
                        isAdmin={isAdmin}
                        onAssign={() => openAssignDialog(process)}
                        onViewAudit={() => openAuditDialog(process)}
                        progressLabel={
                          generationProgress[process.id]?.total > 0
                            ? `${generationProgress[process.id].generated}/${generationProgress[process.id].total}`
                            : undefined
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Código</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>Secretaría</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-center">Docs</TableHead>
                      <TableHead>Actualizado</TableHead>
                      <TableHead className="w-[150px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProcesses.map((process) => (
                      <TableRow key={process.id} className="group">
                        <TableCell className="font-mono text-sm font-medium">
                          <Link
                            href={`/member/documents?processId=${process.id}`}
                            className="rounded text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
                        {/* CAP-08 (RF-030): responsable visible en la vista de procesos */}
                        <TableCell>
                          {process.assignedToName ? (
                            <span className="text-sm">{process.assignedToName}</span>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{process.documentsCount}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{process.updatedAt}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {/* CAP-02: "Continuar" solo en borradores (aún no terminan de generar) */}
                            {isGenerationIncomplete(process) && (
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs"
                                title="Continuar el diligenciamiento donde lo dejaste"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/member/processes/${process.id}/generate`)
                                }}
                              >
                                <Play className="mr-1 h-3 w-3" />
                                {continueLabel(process)}
                              </Button>
                            )}
                            <ProcessActionsMenu
                              process={process}
                              isUpdatingStatus={isUpdatingStatus}
                              onView={() => {
                                setSelectedProcess(process)
                                setIsViewDialogOpen(true)
                              }}
                              onDelete={() => {
                                setSelectedProcess(process)
                                setDeleteError(null)
                                setIsDeleteDialogOpen(true)
                              }}
                              onUpdateStatus={(status) => handleUpdateStatus(process, status)}
                              onReuse={() => handleReuse(process)}
                              isAdmin={isAdmin}
                              onAssign={() => openAssignDialog(process)}
                              onViewAudit={() => openAuditDialog(process)}
                              progressLabel={
                                generationProgress[process.id]?.total > 0
                                  ? `${generationProgress[process.id].generated}/${generationProgress[process.id].total}`
                                  : undefined
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Process Dialog */}
      <CreateProcessDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onProcessCreated={handleProcessCreated}
        onProcessCreatedAndReady={handleProcessReadyToGenerate}
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
          {deleteError && (
            <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {deleteError}
            </p>
          )}
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

      {/* CAP-08 (RF-028): diálogo de asignación de responsable (solo admin) */}
      <Dialog open={!!assignProcess} onOpenChange={(open) => !open && setAssignProcess(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar responsable</DialogTitle>
            <DialogDescription>
              Proceso <strong>{assignProcess?.code}</strong> · {assignProcess?.entityName}. El responsable recibirá
              una notificación y obtendrá acceso a la entidad si aún no lo tiene.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="assignee-select">Responsable</Label>
            <Select value={assigneeSelection} onValueChange={setAssigneeSelection}>
              <SelectTrigger id="assignee-select">
                <SelectValue placeholder="Selecciona un miembro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin responsable</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.email}
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

      {/* CAP-09 (RF-031/032): registro de auditoría del proceso (solo admin) */}
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
              onClick={() =>
                window.open(`/api/audit?processId=${auditProcess?.id}&format=csv`, "_blank")
              }
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
    </div>
  )
}
