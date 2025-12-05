"use client"

import * as React from "react"
import {
  Building,
  Users,
  FolderKanban,
  FileText,
  Plus,
  MoreHorizontal,
  Pencil,
  UserPlus,
  Trash2,
  Loader2,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatsCard } from "@/components/stats-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getEntities, type Entity, type Profile } from "@/lib/supabase/client-data-access"
import { createBrowserClient } from "@/lib/supabase/client"

interface EntityWithCount extends Entity {
  processesCount?: number
}

export function AdminDashboard() {
  const [isCreateEntityOpen, setIsCreateEntityOpen] = React.useState(false)
  const [isInviteMemberOpen, setIsInviteMemberOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [entities, setEntities] = React.useState<EntityWithCount[]>([])
  const [members, setMembers] = React.useState<Profile[]>([])
  const [totalProcesses, setTotalProcesses] = React.useState(0)
  const [organizationName, setOrganizationName] = React.useState("Bufete García & Asociados")

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const supabase = createBrowserClient()

        // Get current user's organization
        const {
          data: { user },
        } = await supabase.auth.getUser()
        let orgId = "11111111-1111-1111-1111-111111111111" // Default org for demo

        if (user) {
          const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

          if (profile?.organization_id) {
            orgId = profile.organization_id
          }
        }

        // Get organization name
        const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).single()

        if (org) {
          setOrganizationName(org.name)
        }

        // Get entities for this organization
        const entitiesData = await getEntities(orgId)

        // Get processes count for each entity
        const entitiesWithCount = await Promise.all(
          entitiesData.map(async (entity) => {
            const { count } = await supabase
              .from("processes")
              .select("*", { count: "exact", head: true })
              .eq("entity_id", entity.id)

            return {
              ...entity,
              processesCount: count || 0,
            }
          }),
        )

        setEntities(entitiesWithCount)
        setTotalProcesses(entitiesWithCount.reduce((acc, e) => acc + (e.processesCount || 0), 0))

        // Get members for this organization
        const { data: membersData } = await supabase
          .from("profiles")
          .select("*")
          .eq("organization_id", orgId)
          .eq("role", "member")

        setMembers(membersData || [])
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const stats = {
    totalEntities: entities.length,
    activeEntities: entities.filter((e) => e.status === "active").length,
    totalMembers: members.length,
    totalProcesses: totalProcesses,
  }

  const entityColumns = [
    {
      key: "name",
      title: "Entidad",
      render: (entity: EntityWithCount) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Building className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{entity.name}</p>
            <p className="text-xs text-muted-foreground">NIT: {entity.nit}</p>
          </div>
        </div>
      ),
    },
    {
      key: "representative_name",
      title: "Representante Legal",
      render: (entity: EntityWithCount) => <span className="text-sm">{entity.representative_name}</span>,
    },
    {
      key: "processesCount",
      title: "Procesos",
      render: (entity: EntityWithCount) => <span className="text-sm">{entity.processesCount || 0}</span>,
    },
    {
      key: "status",
      title: "Estado",
      render: (entity: EntityWithCount) => <StatusBadge status={entity.status} />,
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
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlus className="mr-2 h-4 w-4" />
              Asignar Miembros
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

  const memberColumns = [
    {
      key: "name",
      title: "Miembro",
      render: (user: Profile) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "entities",
      title: "Entidades Asignadas",
      render: () => (
        <div className="flex gap-1">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Todas las entidades</span>
        </div>
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
              <Pencil className="mr-2 h-4 w-4" />
              Editar Permisos
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
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
      <PageHeader title="Administración de Organización" description={organizationName} />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Entidades"
          value={stats.totalEntities}
          description={`${stats.activeEntities} activas`}
          icon={Building}
        />
        <StatsCard title="Miembros" value={stats.totalMembers} description="Asesores jurídicos" icon={Users} />
        <StatsCard
          title="Procesos Totales"
          value={stats.totalProcesses}
          description="En todas las entidades"
          icon={FolderKanban}
        />
        <StatsCard
          title="Documentos"
          value={87}
          description="Generados este mes"
          icon={FileText}
          trend={{ value: 23, isPositive: true }}
        />
      </div>

      {/* Tabs for Entities and Members */}
      <Tabs defaultValue="entities" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="entities">Entidades</TabsTrigger>
            <TabsTrigger value="members">Miembros</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsInviteMemberOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invitar Miembro
            </Button>
            <Button onClick={() => setIsCreateEntityOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Entidad
            </Button>
          </div>
        </div>

        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <CardTitle>Entidades Gestionadas</CardTitle>
              <CardDescription>
                Clientes de la organización (alcaldías, gobernaciones, hospitales, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={entities}
                columns={entityColumns}
                searchPlaceholder="Buscar entidad..."
                searchKey="name"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Equipo de Asesores</CardTitle>
              <CardDescription>Miembros de la organización con acceso a la plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={members}
                columns={memberColumns}
                searchPlaceholder="Buscar miembro..."
                searchKey="name"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Entity Dialog */}
      <Dialog open={isCreateEntityOpen} onOpenChange={setIsCreateEntityOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Nueva Entidad</DialogTitle>
            <DialogDescription>Registra un nuevo cliente para gestionar sus procesos</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="entity-name">Nombre de la Entidad</Label>
              <Input id="entity-name" placeholder="Ej: Alcaldía de Medellín" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="entity-nit">NIT</Label>
                <Input id="entity-nit" placeholder="899.999.XXX-X" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="entity-rep">Representante Legal</Label>
                <Input id="entity-rep" placeholder="Nombre completo" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entity-secretaries">Secretarías</Label>
              <Textarea
                id="entity-secretaries"
                placeholder="Una secretaría por línea (ej: Secretaría de Hacienda)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateEntityOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsCreateEntityOpen(false)}>Crear Entidad</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteMemberOpen} onOpenChange={setIsInviteMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar Nuevo Miembro</DialogTitle>
            <DialogDescription>Envía una invitación por correo electrónico</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="member-email">Correo Electrónico</Label>
              <Input id="member-email" type="email" placeholder="asesor@email.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="member-name">Nombre (opcional)</Label>
              <Input id="member-name" placeholder="Nombre del asesor" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteMemberOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsInviteMemberOpen(false)}>Enviar Invitación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
