"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import {
  ArrowLeft,
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
  MessageSquareText,
  TrendingUp,
  Calendar,
  Building,
  Loader2,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatsCard } from "@/components/stats-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Process } from "@/lib/mock-data"
import { getEntities, getProcessesMapped, type Entity } from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"
import { CreateProcessDialog } from "@/components/member/create-process-dialog"
import { AIAssistant } from "@/components/member/ai-assistant"
import Link from "next/link"

function MemberDashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const entityId = searchParams.get("entity")

  const [isCreateProcessOpen, setIsCreateProcessOpen] = React.useState(false)
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false)

  const { profile, loading: profileLoading } = useProfile()
  const [entity, setEntity] = React.useState<Entity | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [processes, setProcesses] = React.useState<Process[]>([])
  const [loadingProcesses, setLoadingProcesses] = React.useState(true)

  React.useEffect(() => {
    async function loadEntity() {
      if (!profile?.organization_id || !entityId) {
        setLoading(false)
        return
      }
      try {
        const entities = await getEntities(profile.organization_id)
        const foundEntity = entities.find((e) => e.id === entityId)
        setEntity(foundEntity || null)
      } catch (err) {
        console.error("Error loading entity:", err)
      } finally {
        setLoading(false)
      }
    }
    if (!profileLoading && profile?.organization_id) {
      loadEntity()
    }
  }, [profile?.organization_id, profileLoading, entityId])

  React.useEffect(() => {
    async function loadProcesses() {
      if (!entityId) {
        setLoadingProcesses(false)
        return
      }
      try {
        const data = await getProcessesMapped({ entityId })
        setProcesses(data)
      } catch (err) {
        console.error("Error loading processes:", err)
      } finally {
        setLoadingProcesses(false)
      }
    }
    loadProcesses()
  }, [entityId])

  const handleProcessCreated = (newProcess: Process) => {
    setProcesses((prev) => [newProcess, ...prev])
  }

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!entity || !entityId) {
    router.push("/member")
    return null
  }

  const stats = {
    total: processes.length,
    inProgress: processes.filter((p) => p.status === "in_progress").length,
    review: processes.filter((p) => p.status === "review").length,
    completed: processes.filter((p) => p.status === "completed").length,
    draft: processes.filter((p) => p.status === "draft").length,
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  const processColumns = [
    {
      key: "code",
      title: "Código",
      render: (proc: Process) => <span className="font-mono text-sm font-medium">{proc.code}</span>,
    },
    {
      key: "object",
      title: "Objeto del Proceso",
      render: (proc: Process) => (
        <div className="max-w-md">
          <p className="font-medium truncate">{proc.object}</p>
          <p className="text-xs text-muted-foreground truncate">{proc.secretaryName}</p>
        </div>
      ),
    },
    {
      key: "processTypeName",
      title: "Tipo",
      render: (proc: Process) => (
        <Badge variant="outline" className="font-normal">
          {proc.processTypeName}
        </Badge>
      ),
    },
    {
      key: "status",
      title: "Estado",
      render: (proc: Process) => <StatusBadge status={proc.status} />,
    },
    {
      key: "documentsCount",
      title: "Docs",
      render: (proc: Process) => (
        <div className="flex items-center gap-1 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>{proc.documentsCount}</span>
          <span className="text-xs text-muted-foreground">(V{proc.currentVersion})</span>
        </div>
      ),
    },
    {
      key: "updatedAt",
      title: "Actualizado",
      render: (proc: Process) => (
        <span className="text-sm text-muted-foreground">{new Date(proc.updatedAt).toLocaleDateString("es-CO")}</span>
      ),
    },
    {
      key: "actions",
      title: "",
      className: "w-10",
      render: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              Ver Detalles
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Exportar Word
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FileText className="mr-2 h-4 w-4" />
              Generar Nueva Versión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const recentProcesses = [...processes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/member">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <PageHeader title={entity.name} description={`NIT: ${entity.nit} • Rep. Legal: ${entity.representativeName}`}>
          <Button variant="outline" onClick={() => setIsAssistantOpen(true)}>
            <MessageSquareText className="mr-2 h-4 w-4" />
            Asistente Jurídico
          </Button>
          <Button onClick={() => setIsCreateProcessOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proceso
          </Button>
        </PageHeader>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Procesos" value={stats.total} description="En esta entidad" icon={FolderKanban} />
        <StatsCard
          title="En Proceso"
          value={stats.inProgress}
          description="Activos actualmente"
          icon={Clock}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard title="En Revisión" value={stats.review} description="Pendientes de aprobación" icon={AlertCircle} />
        <StatsCard
          title="Completados"
          value={stats.completed}
          description="Finalizados exitosamente"
          icon={CheckCircle2}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>Últimos procesos actualizados</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/member/processes">
                Ver todos
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingProcesses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentProcesses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay procesos registrados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentProcesses.map((proc) => (
                  <div
                    key={proc.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{proc.code}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{proc.object}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={proc.status} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(proc.updatedAt).toLocaleDateString("es-CO")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Progreso General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasa de completación</span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-amber-500">{stats.draft}</p>
                  <p className="text-xs text-muted-foreground">Borradores</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-blue-500">{stats.review}</p>
                  <p className="text-xs text-muted-foreground">En Revisión</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => setIsCreateProcessOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4 text-primary" />
                Crear Nuevo Proceso
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href="/member/documents">
                  <FileText className="mr-2 h-4 w-4 text-primary" />
                  Ver Todos los Documentos
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => setIsAssistantOpen(true)}
              >
                <MessageSquareText className="mr-2 h-4 w-4 text-primary" />
                Consultar Asistente IA
              </Button>
            </CardContent>
          </Card>

          {/* Entity Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                Información de Entidad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">NIT</span>
                <span className="font-medium">{entity.nit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rep. Legal</span>
                <span className="font-medium">{entity.representativeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado</span>
                <StatusBadge status={entity.status} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* All Processes Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Todos los Procesos</CardTitle>
            <CardDescription>Lista completa de procesos de contratación de la entidad</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/member/processes">
              <Calendar className="mr-2 h-4 w-4" />
              Vista Completa
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loadingProcesses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable
              data={processes}
              columns={processColumns}
              searchPlaceholder="Buscar proceso..."
              searchKey="object"
            />
          )}
        </CardContent>
      </Card>

      {/* Create Process Dialog - Added onProcessCreated callback */}
      <CreateProcessDialog
        open={isCreateProcessOpen}
        onOpenChange={setIsCreateProcessOpen}
        onProcessCreated={handleProcessCreated}
      />

      {/* AI Assistant */}
      <AIAssistant open={isAssistantOpen} onOpenChange={setIsAssistantOpen} />
    </div>
  )
}

export default function MemberDashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
      <MemberDashboardContent />
    </Suspense>
  )
}
