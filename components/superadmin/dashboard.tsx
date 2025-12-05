"use client"

import * as React from "react"
import {
  Building2,
  FileStack,
  FolderKanban,
  Users,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getOrganizations,
  getProcessTypes,
  getTemplates,
  type Organization,
  type ProcessType,
  type Template,
} from "@/lib/supabase/client-data-access"

interface OrganizationWithCounts extends Organization {
  membersCount?: number
  entitiesCount?: number
}

export function SuperadminDashboard() {
  const [isCreateOrgOpen, setIsCreateOrgOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [organizations, setOrganizations] = React.useState<OrganizationWithCounts[]>([])
  const [processTypes, setProcessTypes] = React.useState<ProcessType[]>([])
  const [templates, setTemplates] = React.useState<Template[]>([])

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const [orgsData, ptData, tplData] = await Promise.all([getOrganizations(), getProcessTypes(), getTemplates()])
        setOrganizations(orgsData)
        setProcessTypes(ptData)
        setTemplates(tplData)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const stats = {
    totalOrgs: organizations.length,
    activeOrgs: organizations.filter((o) => o.status === "active").length,
    totalProcessTypes: processTypes.length,
    totalTemplates: templates.length,
  }

  const orgColumns = [
    {
      key: "name",
      title: "Organización",
      render: (org: OrganizationWithCounts) => (
        <div>
          <p className="font-medium">{org.name}</p>
          <p className="text-xs text-muted-foreground">NIT: {org.nit}</p>
        </div>
      ),
    },
    {
      key: "membersCount",
      title: "Miembros",
      render: (org: OrganizationWithCounts) => <span className="text-sm">{org.membersCount || 0}</span>,
    },
    {
      key: "entitiesCount",
      title: "Entidades",
      render: (org: OrganizationWithCounts) => <span className="text-sm">{org.entitiesCount || 0}</span>,
    },
    {
      key: "status",
      title: "Estado",
      render: (org: OrganizationWithCounts) => <StatusBadge status={org.status} />,
    },
    {
      key: "created_at",
      title: "Creado",
      render: (org: OrganizationWithCounts) => (
        <span className="text-sm text-muted-foreground">{new Date(org.created_at).toLocaleDateString("es-CO")}</span>
      ),
    },
    {
      key: "actions",
      title: "",
      className: "w-10",
      render: (org: OrganizationWithCounts) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              Suplantar
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Desactivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader title="Panel de Superadministrador" description="Gestiona la plataforma EVA Jurídico de forma global">
        <Button onClick={() => setIsCreateOrgOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Organización
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Organizaciones"
          value={stats.totalOrgs}
          description={`${stats.activeOrgs} activas`}
          icon={Building2}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Total Miembros"
          value={organizations.reduce((acc, o) => acc + (o.membersCount || 0), 0)}
          description="En todas las organizaciones"
          icon={Users}
        />
        <StatsCard
          title="Tipos de Proceso"
          value={stats.totalProcessTypes}
          description="Configurados globalmente"
          icon={FolderKanban}
        />
        <StatsCard title="Plantillas" value={stats.totalTemplates} description="Documentos maestros" icon={FileStack} />
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organizaciones</CardTitle>
          <CardDescription>Lista de bufetes y firmas jurídicas registradas en la plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={organizations}
            columns={orgColumns}
            searchPlaceholder="Buscar organización..."
            searchKey="name"
          />
        </CardContent>
      </Card>

      {/* Quick Access Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="group cursor-pointer transition-all hover:border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Tipos de Proceso</CardTitle>
                <CardDescription>Configura los tipos de contratación disponibles</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {processTypes.slice(0, 3).map((pt) => (
                <span key={pt.id} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {pt.name}
                </span>
              ))}
              {processTypes.length > 3 && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  +{processTypes.length - 3} más
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer transition-all hover:border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <FileStack className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Plantillas Maestras</CardTitle>
                <CardDescription>Gestiona las plantillas de documentos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {templates.slice(0, 2).map((tpl) => (
                <span key={tpl.id} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {tpl.name}
                </span>
              ))}
              {templates.length > 2 && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  +{templates.length - 2} más
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Organization Dialog */}
      <Dialog open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nueva Organización</DialogTitle>
            <DialogDescription>Ingresa los datos del nuevo bufete o firma jurídica</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Nombre de la Organización</Label>
              <Input id="org-name" placeholder="Ej: Bufete Pérez & Asociados" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-nit">NIT</Label>
              <Input id="org-nit" placeholder="Ej: 900.123.456-7" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-email">Email del Administrador</Label>
              <Input id="admin-email" type="email" placeholder="admin@bufete.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOrgOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsCreateOrgOpen(false)}>Crear y Enviar Invitación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
