"use client"

import * as React from "react"
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Building,
  Mail,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Eye,
  UserCheck,
  Filter,
  X,
  Briefcase,
  FileText,
  Activity,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatsCard } from "@/components/stats-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  getEntities,
  getOrganizationMembers,
  getProcessesMapped,
  getDocuments,
  updateMember,
  getMemberAssignedEntities,
  assignMemberEntities,
  type EntityMapped,
  type Profile,
} from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"
import { useRoleSwitcher } from "@/hooks/use-role-switcher"
import { useOrganizationSelector } from "@/hooks/use-organization-selector"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface MemberExtended extends Profile {
  status: "active" | "pending" | "inactive"
  assignedEntities: string[]
  processesCount: number
  documentsCount: number
  lastActive: string
  invitedAt?: string
}

export function MembersPage() {
  const { profile, isLoading: profileLoading } = useProfile()
  const { actualRole, effectiveRole, isSimulating } = useRoleSwitcher(profile?.role)
  const isSuperadmin = actualRole === "superadmin"
  const isSimulatingAdmin = isSuperadmin && effectiveRole === "admin"

  const {
    effectiveOrganizationId,
    isLoaded: orgLoaded,
    selectOrganization,
  } = useOrganizationSelector({
    userOrganizationId: profile?.organization_id,
    isSuperadmin,
    isSimulatingAdmin,
  })

  const [members, setMembers] = React.useState<MemberExtended[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [entityFilter, setEntityFilter] = React.useState<string>("all")

  // Dialogs
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isAssignEntitiesOpen, setIsAssignEntitiesOpen] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<MemberExtended | null>(null)

  // Form states
  const [inviteData, setInviteData] = React.useState({
    email: "",
    name: "",
    message: "",
  })
  const [selectedEntities, setSelectedEntities] = React.useState<string[]>([])
  const [isSending, setIsSending] = React.useState(false)

  // Edit form state
  const [editFormData, setEditFormData] = React.useState({
    name: "",
    email: "",
    status: "active" as "active" | "inactive",
  })
  const [isSaving, setIsSaving] = React.useState(false)

  const [entities, setEntities] = React.useState<EntityMapped[]>([])

  // Load members and calculate stats
  const loadData = React.useCallback(async () => {
    if (!effectiveOrganizationId || !orgLoaded) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log("[MembersPage] Loading data for organization:", effectiveOrganizationId)
      const [membersData, entitiesData] = await Promise.all([
        getOrganizationMembers(effectiveOrganizationId),
        getEntities(effectiveOrganizationId),
      ])

      // Get entity IDs for this organization
      const organizationEntityIds = entitiesData.map((e) => e.id)
      console.log("[MembersPage] Organization entity IDs:", organizationEntityIds)

      // Filter processes and documents by organization entities
      const allProcesses = await getProcessesMapped()
      const allDocuments = await getDocuments()
      
      // Filter processes to only include those from this organization's entities
      const organizationProcesses = allProcesses.filter((p) => organizationEntityIds.includes(p.entityId))
      console.log("[MembersPage] Total processes in DB:", allProcesses.length, "Organization processes:", organizationProcesses.length)
      
      // Filter documents to only include those from this organization's processes
      const organizationProcessIds = organizationProcesses.map((p) => p.id)
      const organizationDocuments = allDocuments.filter((d: any) => {
        // getDocuments returns documents with process_id field (snake_case)
        return organizationProcessIds.includes(d.process_id)
      })
      console.log("[MembersPage] Total documents in DB:", allDocuments.length, "Organization documents:", organizationDocuments.length)

      console.log("[MembersPage] Raw members data:", membersData)
      console.log("[MembersPage] Total profiles:", membersData.length)
      
      // Filter only members (not admins)
      const memberProfiles = membersData.filter((m) => m.role === "member")
      console.log("[MembersPage] Filtered members (role='member'):", memberProfiles.length)
      console.log("[MembersPage] Member profiles:", memberProfiles.map(m => ({ id: m.id, name: m.name, email: m.email, role: m.role, organization_id: m.organization_id })))

      // Calculate stats for each member
      const membersWithStats = await Promise.all(
        memberProfiles.map(async (member) => {
          // Get assigned entities from database, or default to all entities if none assigned
          let assignedEntityIds: string[] = []
          try {
            assignedEntityIds = await getMemberAssignedEntities(member.id)
            // If no entities assigned, default to all entities in organization (backward compatibility)
            if (assignedEntityIds.length === 0) {
              assignedEntityIds = entitiesData.map((e) => e.id)
            }
          } catch (error) {
            console.error(`[MembersPage] Error loading assigned entities for ${member.name}:`, error)
            // Default to all entities if there's an error
            assignedEntityIds = entitiesData.map((e) => e.id)
          }

          // Calculate processes count (processes from assigned entities)
          const memberProcesses = organizationProcesses.filter((p) => assignedEntityIds.includes(p.entityId))
          const processesCount = memberProcesses.length

          // Calculate documents count
          // Since all members have access to all entities, use organization documents count
          // But filter by the member's assigned entities' processes to be accurate
          const processIds = memberProcesses.map((p) => p.id)
          const documentsCount = organizationDocuments.filter((d: any) => {
            // getDocuments returns documents with process_id field (snake_case)
            return processIds.includes(d.process_id)
          }).length
          
          console.log(`[MembersPage] Member ${member.name}: processes=${processesCount}, documents=${documentsCount}, processIds=${processIds.length}, orgProcesses=${organizationProcesses.length}, orgDocuments=${organizationDocuments.length}`)

          // Determine status based on created_at and last_sign_in_at
          // For now, we'll use "active" if the profile exists, "pending" if recently created
          const createdAt = new Date(member.created_at || Date.now())
          const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
          const status: "active" | "pending" | "inactive" =
            daysSinceCreation < 1 ? "pending" : "active"

          return {
            ...member,
            status,
            assignedEntities: assignedEntityIds,
            processesCount,
            documentsCount,
            lastActive: member.updated_at || member.created_at || "",
          } as MemberExtended
        }),
      )

      console.log("[MembersPage] Final members with stats:", membersWithStats.length)
      setMembers(membersWithStats)
      setEntities(entitiesData)
    } catch (err) {
      console.error("[MembersPage] Error loading members:", err)
    } finally {
      setLoading(false)
    }
  }, [effectiveOrganizationId, orgLoaded])

  React.useEffect(() => {
    if (!profileLoading && orgLoaded && effectiveOrganizationId) {
      loadData()
    } else if (!profileLoading && orgLoaded && !effectiveOrganizationId) {
      setLoading(false)
    }
  }, [profileLoading, orgLoaded, effectiveOrganizationId, loadData])

  // Stats
  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    pending: members.filter((m) => m.status === "pending").length,
    inactive: members.filter((m) => m.status === "inactive").length,
  }

  // Filtering
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || member.status === statusFilter
    const matchesEntity = entityFilter === "all" || member.assignedEntities.includes(entityFilter)
    return matchesSearch && matchesStatus && matchesEntity
  })

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setEntityFilter("all")
  }

  const hasActiveFilters = searchQuery || statusFilter !== "all" || entityFilter !== "all"

  // Handlers
  const openViewDialog = (member: MemberExtended) => {
    setSelectedMember(member)
    setIsViewOpen(true)
  }

  const openEditDialog = (member: MemberExtended) => {
    setSelectedMember(member)
    setEditFormData({
      name: member.name,
      email: member.email,
      status: member.status,
    })
    setIsEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedMember) return

    try {
      setIsSaving(true)
      // Update member using updateMember function
      // Note: email and status are not directly editable via updateMember
      // For now, we'll only update the name
      await updateMember(selectedMember.id, {
        name: editFormData.name,
      })
      
      // Reload members to reflect changes
      await loadData()
      
      setIsEditOpen(false)
    } catch (error) {
      console.error("Error updating member:", error)
      alert(error instanceof Error ? error.message : "Error al actualizar el miembro")
    } finally {
      setIsSaving(false)
    }
  }

  const openAssignDialog = (member: MemberExtended) => {
    setSelectedMember(member)
    setSelectedEntities(member.assignedEntities)
    setIsAssignEntitiesOpen(true)
  }

  const openDeleteDialog = (member: MemberExtended) => {
    setSelectedMember(member)
    setIsDeleteOpen(true)
  }

  const handleInvite = async () => {
    if (!effectiveOrganizationId || !inviteData.email) return

    try {
      setIsSending(true)
      const response = await fetch("/api/create-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteData.email,
          name: inviteData.name || inviteData.email.split("@")[0],
          role: "member",
          organizationId: effectiveOrganizationId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al enviar la invitación")
      }

      const result = await response.json()
      console.log("[MembersPage] Member created successfully:", result)
      
      setIsInviteOpen(false)
      setInviteData({ email: "", name: "", message: "" })
      
      // Wait a bit for the database trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Reload members data
      console.log("[MembersPage] Reloading members data...")
      await loadData()
      
      // Switch to "pending" tab to show the newly invited member
      setStatusFilter("pending")
    } catch (err) {
      console.error("Error sending invitation:", err)
      alert(err instanceof Error ? err.message : "Error al enviar la invitación")
    } finally {
      setIsSending(false)
    }
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
      // Save assignments to database
      await assignMemberEntities(selectedMember.id, selectedEntities)
      
      // Update local state
      setMembers((prevMembers) =>
        prevMembers.map((m) =>
          m.id === selectedMember.id
            ? { ...m, assignedEntities: selectedEntities }
            : m
        )
      )

      console.log(`[MembersPage] Successfully assigned ${selectedEntities.length} entities to ${selectedMember.name}`)
      
      setIsAssignEntitiesOpen(false)
    } catch (error) {
      console.error("Error saving assignments:", error)
      alert(error instanceof Error ? error.message : "Error al guardar las asignaciones. Por favor, intenta de nuevo.")
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          label: "Activo",
          color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          icon: CheckCircle2,
        }
      case "pending":
        return { label: "Pendiente", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock }
      case "inactive":
        return { label: "Inactivo", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", icon: XCircle }
      default:
        return { label: status, color: "bg-zinc-500/20 text-zinc-400", icon: Clock }
    }
  }

  const getEntityNames = (entityIds: string[]) => {
    return entityIds.map((id) => entities.find((e) => e.id === id)?.name || "").filter(Boolean)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Nunca"
    const date = new Date(dateString)
    return date.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "Nunca"
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "Hace menos de 1 hora"
    if (diffHours < 24) return `Hace ${diffHours} horas`
    if (diffDays === 1) return "Ayer"
    if (diffDays < 7) return `Hace ${diffDays} días`
    return formatDate(dateString)
  }

  if (loading || profileLoading || !orgLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!effectiveOrganizationId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Selecciona una Organización</h3>
            <p className="text-sm text-muted-foreground">
              Para gestionar miembros, primero debes seleccionar la organización con la que trabajarás.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        title="Gestión de Miembros"
        description="Administra el equipo de asesores jurídicos de tu organización"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Miembros" value={stats.total} description="En la organización" icon={Users} />
        <StatsCard title="Activos" value={stats.active} description="Con acceso al sistema" icon={CheckCircle2} />
        <StatsCard title="Pendientes" value={stats.pending} description="Invitaciones enviadas" icon={Clock} />
        <StatsCard title="Inactivos" value={stats.inactive} description="Sin acceso actual" icon={XCircle} />
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
            <TabsTrigger value="active">Activos ({stats.active})</TabsTrigger>
            <TabsTrigger value="pending">Pendientes ({stats.pending})</TabsTrigger>
            <TabsTrigger value="inactive">Inactivos ({stats.inactive})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invitar Miembro
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por entidad" />
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
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.map((member) => {
          const statusConfig = getStatusConfig(member.status)
          const StatusIcon = statusConfig.icon
          const entityNames = getEntityNames(member.assignedEntities)

          return (
            <Card
              key={member.id}
              className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30"
            >
              <CardContent className="pt-6">
                {/* Status Badge */}
                <div className="absolute right-4 top-4">
                  <Badge variant="outline" className={cn("gap-1", statusConfig.color)}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </Badge>
                </div>

                {/* Member Info */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    <AvatarImage src={member.avatar_url || "/placeholder.svg"} alt={member.name} />
                    <AvatarFallback className="bg-primary/20 text-primary text-lg">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{member.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <span>Asesor Jurídico</span>
                    </div>
                  </div>
                </div>

                {/* Assigned Entities */}
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Entidades Asignadas</p>
                  {entityNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {entityNames.slice(0, 2).map((name, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <Building className="mr-1 h-3 w-3" />
                          {name}
                        </Badge>
                      ))}
                      {entityNames.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{entityNames.length - 2} más
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin entidades asignadas</p>
                  )}
                </div>

                {/* Stats */}
                {member.status === "active" && (
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
                    <div className="text-center">
                      <p className="text-lg font-semibold">{member.processesCount}</p>
                      <p className="text-xs text-muted-foreground">Procesos</p>
                    </div>
                    <div className="text-center border-x border-border">
                      <p className="text-lg font-semibold">{member.documentsCount}</p>
                      <p className="text-xs text-muted-foreground">Documentos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{member.assignedEntities.length}</p>
                      <p className="text-xs text-muted-foreground">Entidades</p>
                    </div>
                  </div>
                )}

                {member.status === "pending" && (
                  <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm font-medium">Invitación Pendiente</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enviada el {formatDate(member.invitedAt || "")}
                    </p>
                  </div>
                )}

                {/* Last Active */}
                {member.status !== "pending" && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    <span>Última actividad: {formatRelativeTime(member.lastActive)}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openViewDialog(member)}>
                      <Eye className="mr-1 h-4 w-4" />
                      Ver
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openAssignDialog(member)}>
                      <Building className="mr-1 h-4 w-4" />
                      Entidades
                    </Button>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEditDialog(member)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openAssignDialog(member)}>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Asignar Entidades
                      </DropdownMenuItem>
                      {member.status === "pending" && (
                        <DropdownMenuItem onSelect={() => {
                          // TODO: Implement resend invitation
                          console.log("Reenviar invitación para:", member.email)
                        }}>
                          <Send className="mr-2 h-4 w-4" />
                          Reenviar Invitación
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive" 
                        onSelect={(e) => {
                          e.preventDefault()
                          openDeleteDialog(member)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredMembers.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No se encontraron miembros</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Intenta ajustar los filtros o invita a un nuevo miembro
            </p>
            <Button className="mt-4" onClick={() => setIsInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invitar Miembro
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              Invitar Nuevo Miembro
            </DialogTitle>
            <DialogDescription>
              Envía una invitación por correo electrónico para unirse a la organización
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Correo Electrónico *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="asesor@ejemplo.com"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-name">Nombre (Opcional)</Label>
              <Input
                id="invite-name"
                placeholder="Nombre del asesor"
                value={inviteData.name}
                onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">El invitado podrá actualizar su nombre al registrarse</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-message">Mensaje Personalizado (Opcional)</Label>
              <Textarea
                id="invite-message"
                placeholder="Escribe un mensaje personalizado para incluir en la invitación..."
                value={inviteData.message}
                onChange={(e) => setInviteData({ ...inviteData, message: e.target.value })}
                rows={3}
              />
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Vista previa del correo</p>
                    <p className="text-muted-foreground mt-1">
                      Se enviará un correo a <strong>{inviteData.email || "email@ejemplo.com"}</strong> con un enlace
                      para registrarse y acceder a la plataforma EVA Jurídico.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={!inviteData.email || isSending}>
              {isSending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Member Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Miembro</DialogTitle>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={selectedMember.avatar_url || "/placeholder.svg"} alt={selectedMember.name} />
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                    {selectedMember.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{selectedMember.name}</h3>
                    <Badge variant="outline" className={cn("gap-1", getStatusConfig(selectedMember.status).color)}>
                      {getStatusConfig(selectedMember.status).label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{selectedMember.email}</p>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      Asesor Jurídico
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Última actividad: {formatRelativeTime(selectedMember.lastActive)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-center">
                    <Briefcase className="mx-auto h-8 w-8 text-primary mb-2" />
                    <p className="text-2xl font-bold">{selectedMember.processesCount}</p>
                    <p className="text-sm text-muted-foreground">Procesos Gestionados</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-center">
                    <FileText className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                    <p className="text-2xl font-bold">{selectedMember.documentsCount}</p>
                    <p className="text-sm text-muted-foreground">Documentos Generados</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-center">
                    <Building className="mx-auto h-8 w-8 text-amber-500 mb-2" />
                    <p className="text-2xl font-bold">{selectedMember.assignedEntities.length}</p>
                    <p className="text-sm text-muted-foreground">Entidades Asignadas</p>
                  </CardContent>
                </Card>
              </div>

              {/* Assigned Entities */}
              <div>
                <h4 className="font-medium mb-3">Entidades Asignadas</h4>
                {selectedMember.assignedEntities.length > 0 ? (
                  <div className="space-y-2">
                    {getEntityNames(selectedMember.assignedEntities).map((name, idx) => {
                      const entity = entities.find((e) => e.name === name)
                      return (
                        <Card key={idx} className="bg-muted/50">
                          <CardContent className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                                <Building className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{name}</p>
                                <p className="text-xs text-muted-foreground">NIT: {entity?.nit || "N/A"}</p>
                              </div>
                            </div>
                            <Badge variant="secondary">{entity?.processesCount || 0} procesos</Badge>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Este miembro no tiene entidades asignadas</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                setIsViewOpen(false)
                if (selectedMember) openEditDialog(selectedMember)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Miembro</DialogTitle>
            <DialogDescription>Actualiza la información del miembro</DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedMember.avatar_url || "/placeholder.svg"} alt={selectedMember.name} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {selectedMember.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedMember.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre</Label>
                <Input 
                  id="edit-name" 
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Correo Electrónico</Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  value={editFormData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">El correo electrónico no se puede modificar</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Estado</Label>
                <Select 
                  value={editFormData.status}
                  onValueChange={(value: "active" | "inactive") => setEditFormData({ ...editFormData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">El estado se calcula automáticamente según la actividad del usuario</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar Cambios"}
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
                      <p className="text-xs text-muted-foreground">
                        NIT: {entity.nit} • {entity.processesCount} procesos
                      </p>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminar Miembro</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a {selectedMember?.name}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedMember.avatar_url || "/placeholder.svg"} alt={selectedMember.name} />
                <AvatarFallback className="bg-destructive/20 text-destructive">
                  {selectedMember.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedMember.name}</p>
                <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => setIsDeleteOpen(false)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
