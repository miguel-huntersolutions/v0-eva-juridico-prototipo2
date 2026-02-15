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
  UserCheck,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getEntities, getMemberAssignedEntities, assignMemberEntities, createEntity, updateEntity, type EntityMapped, type Profile } from "@/lib/supabase/client-data-access"
import { cn } from "@/lib/utils"
import { createBrowserClient } from "@/lib/supabase/client"
import { useOrganizationSelector } from "@/hooks/use-organization-selector"
import Link from "next/link"
import { useProfile } from "@/hooks/use-profile"
import { useRoleSwitcher } from "@/hooks/use-role-switcher"

interface EntityWithCount extends EntityMapped {
  processesCount?: number
}

export function AdminDashboard() {
  const [isCreateEntityOpen, setIsCreateEntityOpen] = React.useState(false)
  const [isInviteMemberOpen, setIsInviteMemberOpen] = React.useState(false)
  const [isAssignEntitiesOpen, setIsAssignEntitiesOpen] = React.useState(false)
  const [isEditEntityOpen, setIsEditEntityOpen] = React.useState(false)
  const [isAssignMembersToEntityOpen, setIsAssignMembersToEntityOpen] = React.useState(false)
  const [selectedEntity, setSelectedEntity] = React.useState<EntityWithCount | null>(null)
  const [selectedMember, setSelectedMember] = React.useState<Profile | null>(null)
  const [selectedEntities, setSelectedEntities] = React.useState<string[]>([])
  const [selectedMembersForEntity, setSelectedMembersForEntity] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [entities, setEntities] = React.useState<EntityWithCount[]>([])
  const [members, setMembers] = React.useState<Profile[]>([])
  const [memberAssignments, setMemberAssignments] = React.useState<Record<string, string[]>>({})
  const [totalProcesses, setTotalProcesses] = React.useState(0)
  const [documentsThisMonth, setDocumentsThisMonth] = React.useState(0)
  const [documentsLastMonth, setDocumentsLastMonth] = React.useState(0)
  const [organizationName, setOrganizationName] = React.useState("")
  
  // Entity form state
  const [entityForm, setEntityForm] = React.useState({
    name: "",
    nit: "",
    representativeName: "",
  })
  const [isSavingEntity, setIsSavingEntity] = React.useState(false)
  
  // Edit entity form state
  const [editEntityForm, setEditEntityForm] = React.useState({
    name: "",
    nit: "",
    representativeName: "",
    status: "active" as "active" | "inactive",
  })
  const [isSavingEdit, setIsSavingEdit] = React.useState(false)

  const { profile } = useProfile()
  const { actualRole, isSimulating } = useRoleSwitcher(profile?.role)
  const { effectiveOrganizationId, selectedOrganization } = useOrganizationSelector({
    userOrganizationId: profile?.organization_id,
    isSuperadmin: actualRole === "superadmin",
    isSimulatingAdmin: isSimulating && actualRole === "superadmin",
  })

  React.useEffect(() => {
    async function loadData() {
      if (!effectiveOrganizationId) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const supabase = createBrowserClient()

        if (selectedOrganization) {
          setOrganizationName(selectedOrganization.name)
        } else {
          const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", effectiveOrganizationId)
            .single()

          if (org) {
            setOrganizationName(org.name)
          }
        }

        const entitiesData = await getEntities(effectiveOrganizationId)

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

        // Calculate documents for this month and last month
        const entityIds = entitiesWithCount.map((e) => e.id)
        
        // Get all processes for these entities
        const { data: processes } = await supabase
          .from("processes")
          .select("id")
          .in("entity_id", entityIds)
        
        const processIds = processes?.map((p) => p.id) || []
        
        if (processIds.length > 0) {
          // Get current date range (this month)
          const now = new Date()
          const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          
          // Count documents this month
          const { count: docsThisMonth } = await supabase
            .from("documents")
            .select("*", { count: "exact", head: true })
            .in("process_id", processIds)
            .gte("created_at", startOfThisMonth.toISOString())
          
          // Count documents last month
          const { count: docsLastMonth } = await supabase
            .from("documents")
            .select("*", { count: "exact", head: true })
            .in("process_id", processIds)
            .gte("created_at", startOfLastMonth.toISOString())
            .lt("created_at", startOfCurrentMonth.toISOString())
          
          setDocumentsThisMonth(docsThisMonth || 0)
          setDocumentsLastMonth(docsLastMonth || 0)
        } else {
          setDocumentsThisMonth(0)
          setDocumentsLastMonth(0)
        }

        // Use getOrganizationMembers to bypass RLS
        const { getOrganizationMembers, getMemberAssignedEntities } = await import("@/lib/supabase/client-data-access")
        const membersData = await getOrganizationMembers(effectiveOrganizationId)
        // Filter only members (not admins)
        const memberProfiles = membersData.filter((m) => m.role === "member")
        setMembers(memberProfiles)
        console.log("[AdminDashboard] Loaded members:", memberProfiles.length)
        
        // Load assigned entities for each member
        const assignments: Record<string, string[]> = {}
        await Promise.all(
          memberProfiles.map(async (member) => {
            try {
              const assignedIds = await getMemberAssignedEntities(member.id)
              // If no assignments, default to all entities (backward compatibility)
              assignments[member.id] = assignedIds.length > 0 ? assignedIds : entitiesWithCount.map((e) => e.id)
            } catch (error) {
              console.error(`[AdminDashboard] Error loading assignments for ${member.name}:`, error)
              // Default to all entities if error
              assignments[member.id] = entitiesWithCount.map((e) => e.id)
            }
          })
        )
        setMemberAssignments(assignments)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [effectiveOrganizationId, selectedOrganization])

  const openAssignDialog = async (member: Profile) => {
    setSelectedMember(member)
    try {
      // Load current assignments
      const assignedIds = await getMemberAssignedEntities(member.id)
      setSelectedEntities(assignedIds.length > 0 ? assignedIds : entities.map((e) => e.id))
    } catch (error) {
      console.error("Error loading assigned entities:", error)
      // Default to all entities if error
      setSelectedEntities(entities.map((e) => e.id))
    }
    setIsAssignEntitiesOpen(true)
  }

  const toggleEntity = (entityId: string) => {
    if (selectedEntities.includes(entityId)) {
      setSelectedEntities(selectedEntities.filter((id) => id !== entityId))
    } else {
      setSelectedEntities([...selectedEntities, entityId])
    }
  }

  const handleSaveAssignments = async () => {
    if (!selectedMember) return

    try {
      await assignMemberEntities(selectedMember.id, selectedEntities)
      
      // Update assignments state immediately
      setMemberAssignments((prev) => ({
        ...prev,
        [selectedMember.id]: selectedEntities,
      }))
      
      setIsAssignEntitiesOpen(false)
    } catch (error) {
      console.error("Error saving assignments:", error)
      alert(error instanceof Error ? error.message : "Error al guardar las asignaciones")
    }
  }

  const openEditEntityDialog = (entity: EntityWithCount) => {
    setSelectedEntity(entity)
    setEditEntityForm({
      name: entity.name,
      nit: entity.nit,
      representativeName: entity.representativeName || "",
      status: (entity.status || "active") as "active" | "inactive",
    })
    setIsEditEntityOpen(true)
  }

  const handleSaveEditEntity = async () => {
    if (!selectedEntity) return

    try {
      setIsSavingEdit(true)
      const updatedEntity = await updateEntity(selectedEntity.id, {
        name: editEntityForm.name,
        nit: editEntityForm.nit,
        representativeName: editEntityForm.representativeName,
        status: editEntityForm.status,
      })
      
      setEntities(entities.map((e) => (e.id === selectedEntity.id ? { ...updatedEntity, processesCount: selectedEntity.processesCount } : e)))
      setIsEditEntityOpen(false)
      setSelectedEntity(null)
    } catch (error) {
      console.error("Error updating entity:", error)
      alert(error instanceof Error ? error.message : "Error al actualizar la entidad")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const openAssignMembersToEntityDialog = async (entity: EntityWithCount) => {
    setSelectedEntity(entity)
    try {
      // Get members that are assigned to this entity
      const assignedMemberIds: string[] = []
      for (const member of members) {
        const assignedIds = memberAssignments[member.id] || []
        if (assignedIds.includes(entity.id)) {
          assignedMemberIds.push(member.id)
        }
      }
      // If no members are assigned, default to all members (backward compatibility)
      setSelectedMembersForEntity(assignedMemberIds.length > 0 ? assignedMemberIds : members.map((m) => m.id))
    } catch (error) {
      console.error("Error loading assigned members:", error)
      setSelectedMembersForEntity(members.map((m) => m.id))
    }
    setIsAssignMembersToEntityOpen(true)
  }

  const toggleMemberForEntity = (memberId: string) => {
    setSelectedMembersForEntity((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  const handleSaveMembersToEntity = async () => {
    if (!selectedEntity) return

    try {
      // Update assignments for each selected member
      await Promise.all(
        selectedMembersForEntity.map(async (memberId) => {
          const currentAssignments = memberAssignments[memberId] || []
          if (!currentAssignments.includes(selectedEntity.id)) {
            await assignMemberEntities(memberId, [...currentAssignments, selectedEntity.id])
          }
        })
      )

      // Remove entity from members that are not selected
      await Promise.all(
        members
          .filter((m) => !selectedMembersForEntity.includes(m.id))
          .map(async (member) => {
            const currentAssignments = memberAssignments[member.id] || []
            const updatedAssignments = currentAssignments.filter((id) => id !== selectedEntity.id)
            await assignMemberEntities(member.id, updatedAssignments)
          })
      )

      // Reload data to refresh assignments
      const { getOrganizationMembers, getMemberAssignedEntities } = await import("@/lib/supabase/client-data-access")
      const membersData = await getOrganizationMembers(effectiveOrganizationId)
      const memberProfiles = membersData.filter((m) => m.role === "member")
      
      const assignments: Record<string, string[]> = {}
      await Promise.all(
        memberProfiles.map(async (member) => {
          try {
            const assignedIds = await getMemberAssignedEntities(member.id)
            assignments[member.id] = assignedIds.length > 0 ? assignedIds : entities.map((e) => e.id)
          } catch (error) {
            assignments[member.id] = entities.map((e) => e.id)
          }
        })
      )
      setMemberAssignments(assignments)

      setIsAssignMembersToEntityOpen(false)
      setSelectedEntity(null)
    } catch (error) {
      console.error("Error saving member assignments:", error)
      alert(error instanceof Error ? error.message : "Error al guardar las asignaciones")
    }
  }

  const handleCreateEntity = async () => {
    if (!effectiveOrganizationId) {
      alert("No se ha seleccionado una organización")
      return
    }

    if (!entityForm.name || !entityForm.nit || !entityForm.representativeName) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    try {
      setIsSavingEntity(true)
      const newEntity = await createEntity({
        name: entityForm.name,
        nit: entityForm.nit,
        representativeName: entityForm.representativeName,
        organizationId: effectiveOrganizationId,
        status: "active",
      })

      // Reload entities
      const entitiesData = await getEntities(effectiveOrganizationId)
      const supabase = createBrowserClient()
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
      
      // Reset form and close dialog
      setEntityForm({ name: "", nit: "", representativeName: "" })
      setIsCreateEntityOpen(false)
    } catch (error) {
      console.error("Error creating entity:", error)
      alert(error instanceof Error ? error.message : "Error al crear la entidad")
    } finally {
      setIsSavingEntity(false)
    }
  }

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
      key: "representativeName",
      title: "Representante Legal",
      render: (entity: EntityWithCount) => <span className="text-sm">{entity.representativeName || "N/A"}</span>,
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
      render: (entity: EntityWithCount) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openEditEntityDialog(entity)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openAssignMembersToEntityDialog(entity)}>
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
            <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
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
      render: (user: Profile) => {
        const assignedIds = memberAssignments[user.id] || []
        const allEntityIds = entities.map((e) => e.id)
        const hasAllEntities = assignedIds.length === allEntityIds.length && 
          assignedIds.every((id) => allEntityIds.includes(id))
        
        if (hasAllEntities) {
          return (
            <div className="flex gap-1">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Todas las entidades</span>
            </div>
          )
        }
        
        const assignedEntities = entities.filter((e) => assignedIds.includes(e.id))
        if (assignedEntities.length === 0) {
          return (
            <div className="flex gap-1">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Sin asignar</span>
            </div>
          )
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {assignedEntities.slice(0, 2).map((entity) => (
              <span key={entity.id} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                {entity.name}
              </span>
            ))}
            {assignedEntities.length > 2 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                +{assignedEntities.length - 2} más
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "actions",
      title: "",
      className: "w-10",
      render: (user: Profile) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openAssignDialog(user)}>
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
          value={documentsThisMonth}
          description="Generados este mes"
          icon={FileText}
          trend={
            documentsLastMonth > 0
              ? {
                  value: Math.round(((documentsThisMonth - documentsLastMonth) / documentsLastMonth) * 100),
                  isPositive: documentsThisMonth >= documentsLastMonth,
                }
              : documentsThisMonth > 0
                ? { value: 100, isPositive: true }
                : undefined
          }
        />
      </div>

      <Tabs defaultValue="entities" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="entities">Entidades</TabsTrigger>
            <TabsTrigger value="members">Miembros</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/members?openInvite=1">
                <UserPlus className="mr-2 h-4 w-4" />
                Invitar Miembro
              </Link>
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

      <Dialog open={isCreateEntityOpen} onOpenChange={setIsCreateEntityOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Nueva Entidad</DialogTitle>
            <DialogDescription>Registra un nuevo cliente para gestionar sus procesos</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="entity-name">Nombre de la Entidad</Label>
              <Input 
                id="entity-name" 
                placeholder="Ej: Alcaldía de Medellín"
                value={entityForm.name}
                onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="entity-nit">NIT</Label>
                <Input 
                  id="entity-nit" 
                  placeholder="899.999.XXX-X"
                  value={entityForm.nit}
                  onChange={(e) => setEntityForm({ ...entityForm, nit: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="entity-rep">Representante Legal</Label>
                <Input 
                  id="entity-rep" 
                  placeholder="Nombre completo"
                  value={entityForm.representativeName}
                  onChange={(e) => setEntityForm({ ...entityForm, representativeName: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateEntityOpen(false)
              setEntityForm({ name: "", nit: "", representativeName: "" })
            }} disabled={isSavingEntity}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEntity} disabled={isSavingEntity}>
              {isSavingEntity ? "Guardando..." : "Crear Entidad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Entities Dialog */}
      <Dialog open={isAssignEntitiesOpen} onOpenChange={setIsAssignEntitiesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Asignar Entidades
            </DialogTitle>
            <DialogDescription>
              Selecciona las entidades a las que {selectedMember?.name} tendrá acceso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-3 transition-colors cursor-pointer",
                    selectedEntities.includes(entity.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                  onClick={() => toggleEntity(entity.id)}
                >
                  <Checkbox
                    id={`entity-${entity.id}`}
                    checked={selectedEntities.includes(entity.id)}
                    onCheckedChange={() => toggleEntity(entity.id)}
                  />
                  <label htmlFor={`entity-${entity.id}`} className="flex flex-1 items-center gap-3 cursor-pointer">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Building className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entity.name}</p>
                      <p className="text-xs text-muted-foreground">NIT: {entity.nit} • {entity.processesCount || 0} procesos</p>
                    </div>
                  </label>
                </div>
              ))}
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>{selectedEntities.length}</strong> entidades seleccionadas. El miembro podrá ver y gestionar
                  los procesos de las entidades asignadas.
                </p>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignEntitiesOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAssignments}>
              <UserCheck className="mr-2 h-4 w-4" />
              Guardar Asignaciones
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entity Dialog */}
      <Dialog open={isEditEntityOpen} onOpenChange={setIsEditEntityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Entidad</DialogTitle>
            <DialogDescription>Actualiza la información de {selectedEntity?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editEntityForm.name}
                onChange={(e) => setEditEntityForm({ ...editEntityForm, name: e.target.value })}
                placeholder="Nombre de la entidad"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nit">NIT</Label>
              <Input
                id="edit-nit"
                value={editEntityForm.nit}
                onChange={(e) => setEditEntityForm({ ...editEntityForm, nit: e.target.value })}
                placeholder="NIT de la entidad"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-representative">Representante Legal</Label>
              <Input
                id="edit-representative"
                value={editEntityForm.representativeName}
                onChange={(e) => setEditEntityForm({ ...editEntityForm, representativeName: e.target.value })}
                placeholder="Nombre del representante legal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Estado</Label>
              <Select
                value={editEntityForm.status}
                onValueChange={(value: "active" | "inactive") => setEditEntityForm({ ...editEntityForm, status: value })}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditEntityOpen(false)} disabled={isSavingEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEditEntity} disabled={isSavingEdit}>
              {isSavingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Members to Entity Dialog */}
      <Dialog open={isAssignMembersToEntityOpen} onOpenChange={setIsAssignMembersToEntityOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Miembros</DialogTitle>
            <DialogDescription>
              Selecciona los miembros que tendrán acceso a {selectedEntity?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleMemberForEntity(member.id)}
              >
                <Checkbox checked={selectedMembersForEntity.includes(member.id)} />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar_url || undefined} alt={member.name} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignMembersToEntityOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMembersToEntity}>
              <UserCheck className="mr-2 h-4 w-4" />
              Guardar Asignaciones
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
