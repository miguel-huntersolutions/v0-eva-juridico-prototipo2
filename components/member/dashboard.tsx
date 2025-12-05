"use client"

import * as React from "react"
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
  Loader2,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatsCard } from "@/components/stats-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getProcesses, type Entity, type ProcessWithRelations } from "@/lib/supabase/client-data-access"
import { CreateProcessDialog } from "./create-process-dialog"
import { AIAssistant } from "./ai-assistant"

interface MemberDashboardProps {
  entity: Entity
  onBack: () => void
}

export function MemberDashboard({ entity, onBack }: MemberDashboardProps) {
  const [isCreateProcessOpen, setIsCreateProcessOpen] = React.useState(false)
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [processes, setProcesses] = React.useState<ProcessWithRelations[]>([])

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const processesData = await getProcesses({ entityId: entity.id })
        setProcesses(processesData)
      } catch (error) {
        console.error("Error loading processes:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [entity.id])

  const stats = {
    total: processes.length,
    inProgress: processes.filter((p) => p.status === "in_progress").length,
    review: processes.filter((p) => p.status === "review").length,
    completed: processes.filter((p) => p.status === "completed").length,
  }

  const processColumns = [
    {
      key: "code",
      title: "Código",
      render: (proc: ProcessWithRelations) => <span className="font-mono text-sm font-medium">{proc.code}</span>,
    },
    {
      key: "object",
      title: "Objeto del Proceso",
      render: (proc: ProcessWithRelations) => (
        <div className="max-w-md">
          <p className="font-medium truncate">{proc.object}</p>
          <p className="text-xs text-muted-foreground truncate">{proc.secretary?.name || "Sin secretaría"}</p>
        </div>
      ),
    },
    {
      key: "process_type",
      title: "Tipo",
      render: (proc: ProcessWithRelations) => <span className="text-sm">{proc.process_type?.name || "N/A"}</span>,
    },
    {
      key: "status",
      title: "Estado",
      render: (proc: ProcessWithRelations) => <StatusBadge status={proc.status} />,
    },
    {
      key: "documents_count",
      title: "Docs",
      render: (proc: ProcessWithRelations) => (
        <div className="flex items-center gap-1 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>{proc.documents_count || 0}</span>
          <span className="text-xs text-muted-foreground">(V{proc.current_version})</span>
        </div>
      ),
    },
    {
      key: "updated_at",
      title: "Actualizado",
      render: (proc: ProcessWithRelations) => (
        <span className="text-sm text-muted-foreground">{new Date(proc.updated_at).toLocaleDateString("es-CO")}</span>
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
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader title={entity.name} description={`NIT: ${entity.nit} • Rep. Legal: ${entity.representative_name}`}>
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
        <StatsCard title="En Proceso" value={stats.inProgress} description="Activos actualmente" icon={Clock} />
        <StatsCard title="En Revisión" value={stats.review} description="Pendientes de aprobación" icon={AlertCircle} />
        <StatsCard
          title="Completados"
          value={stats.completed}
          description="Finalizados exitosamente"
          icon={CheckCircle2}
        />
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimos procesos actualizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProcesses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay procesos recientes</p>
              ) : (
                recentProcesses.map((proc) => (
                  <div
                    key={proc.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
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
                        {new Date(proc.updated_at).toLocaleDateString("es-CO")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Tareas frecuentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={() => setIsCreateProcessOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4 text-primary" />
              Crear Nuevo Proceso
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <FileText className="mr-2 h-4 w-4 text-primary" />
              Ver Todos los Documentos
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
      </div>

      {/* All Processes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Todos los Procesos</CardTitle>
          <CardDescription>Lista completa de procesos de contratación de la entidad</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={processes}
            columns={processColumns}
            searchPlaceholder="Buscar proceso..."
            searchKey="object"
          />
        </CardContent>
      </Card>

      {/* Create Process Dialog */}
      <CreateProcessDialog open={isCreateProcessOpen} onOpenChange={setIsCreateProcessOpen} entity={entity} />

      {/* AI Assistant */}
      <AIAssistant open={isAssistantOpen} onOpenChange={setIsAssistantOpen} />
    </div>
  )
}
