"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Users,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  MoreHorizontal,
  Mail,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getOrganizations,
  getOrganizationMembers,
  getEntities,
  assignExistingMember,
  updateMember,
  deleteMember,
  createEntity,
  deleteEntity,
  getUsersWithoutOrganization,
  type Organization,
  type Profile,
  type Entity,
} from "@/lib/supabase/client-data-access"
import { logger } from "@/lib/logger"

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = params.id as string
  const pageLoadTime = React.useRef(Date.now())

  const [organization, setOrganization] = React.useState<Organization | null>(null)
  const [members, setMembers] = React.useState<Profile[]>([])
  const [entities, setEntities] = React.useState<Entity[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("members")

  // Member dialog state
  const [isAddMemberOpen, setIsAddMemberOpen] = React.useState(false)
  const [isEditMemberOpen, setIsEditMemberOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<Profile | null>(null)
  const [availableUsers, setAvailableUsers] = React.useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
  const [memberForm, setMemberForm] = React.useState({
    name: "",
    email: "",
    role: "member" as "admin" | "member",
  })
  const [savingMember, setSavingMember] = React.useState(false)
  const [memberError, setMemberError] = React.useState<string | null>(null)

  // Entity dialog state
  const [isAddEntityOpen, setIsAddEntityOpen] = React.useState(false)
  const [entityForm, setEntityForm] = React.useState({
    name: "",
    nit: "",
    representativeName: "",
  })
  const [savingEntity, setSavingEntity] = React.useState(false)
  const [entityError, setEntityError] = React.useState<string | null>(null)

  // Delete confirmation
  const [isDeleteMemberOpen, setIsDeleteMemberOpen] = React.useState(false)
  const [memberToDelete, setMemberToDelete] = React.useState<Profile | null>(null)
  const [isDeleteEntityOpen, setIsDeleteEntityOpen] = React.useState(false)
  const [entityToDelete, setEntityToDelete] = React.useState<Entity | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    logger.pageView("/superadmin/organizations/[id]", undefined, undefined, { organizationId })
  }, [organizationId])

  const loadData = React.useCallback(async () => {
    const startTime = Date.now()
    try {
      setLoading(true)
      const [orgs, membersList, entitiesList] = await Promise.all([
        getOrganizations(),
        getOrganizationMembers(organizationId),
        getEntities(organizationId),
      ])

      const org = orgs.find((o) => o.id === organizationId)
      setOrganization(org || null)
      setMembers(membersList)
      setEntities(entitiesList)
      logger.fetch("/superadmin/organizations/[id]", "Organization data", true, Date.now() - startTime)
      logger.pageLoaded("/superadmin/organizations/[id]", Date.now() - pageLoadTime.current)
    } catch (err) {
      logger.error("/superadmin/organizations/[id]", "Error loading organization data", err)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const loadAvailableUsers = React.useCallback(async () => {
    try {
      const users = await getUsersWithoutOrganization()
      setAvailableUsers(users)
      logger.action("/superadmin/organizations/[id]", "Load Available Users", { count: users.length })
    } catch (err) {
      console.error("[v0] Error loading available users:", err)
      logger.error("/superadmin/organizations/[id]", err as Error, { action: "loadAvailableUsers" })
    }
  }, [])

  const handleAddMember = async () => {
    if (!selectedUserId) {
      setMemberError("Debes seleccionar un usuario")
      return
    }

    try {
      setSavingMember(true)
      setMemberError(null)

      await assignExistingMember({
        userId: selectedUserId,
        role: memberForm.role,
        organizationId,
      })

      await loadData()
      await loadAvailableUsers() // Refresh available users list
      setIsAddMemberOpen(false)
      setMemberForm({ name: "", email: "", role: "member" })
      setSelectedUserId(null)
      setSearchQuery("")
      logger.action("/superadmin/organizations/[id]", "Add Member", { organizationId, userId: selectedUserId })
    } catch (err) {
      console.error("[v0] Error adding member:", err)
      setMemberError("Error al agregar el miembro. Puede que ya pertenezca a esta organización.")
      logger.error("/superadmin/organizations/[id]", err as Error, { action: "handleAddMember" })
    } finally {
      setSavingMember(false)
    }
  }

  const handleEditMember = async () => {
    if (!selectedMember) return

    try {
      setSavingMember(true)
      setMemberError(null)
      await updateMember(selectedMember.id, {
        name: memberForm.name,
        role: memberForm.role,
      })
      await loadData()
      setIsEditMemberOpen(false)
      setSelectedMember(null)
      logger.action("/superadmin/organizations/[id]", "Edit Member", { organizationId, member: memberForm })
    } catch (err) {
      console.error("[v0] Error updating member:", err)
      setMemberError("Error al actualizar el miembro")
      logger.error("/superadmin/organizations/[id]", "Error editing member", err)
    } finally {
      setSavingMember(false)
    }
  }

  const handleDeleteMember = async () => {
    if (!memberToDelete) return

    try {
      setIsDeleting(true)
      await deleteMember(memberToDelete.id)
      await loadData()
      setIsDeleteMemberOpen(false)
      setMemberToDelete(null)
      logger.action("/superadmin/organizations/[id]", "Delete Member", { organizationId, member: memberToDelete })
    } catch (err) {
      console.error("[v0] Error deleting member:", err)
      logger.error("/superadmin/organizations/[id]", "Error deleting member", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddEntity = async () => {
    if (!entityForm.name || !entityForm.nit) {
      setEntityError("Nombre y NIT son requeridos")
      return
    }

    try {
      setSavingEntity(true)
      setEntityError(null)
      await createEntity({
        name: entityForm.name,
        nit: entityForm.nit,
        representativeName: entityForm.representativeName,
        organizationId,
      })
      await loadData()
      setIsAddEntityOpen(false)
      setEntityForm({ name: "", nit: "", representativeName: "" })
      logger.action("/superadmin/organizations/[id]", "Add Entity", { organizationId, entity: entityForm })
    } catch (err) {
      console.error("[v0] Error adding entity:", err)
      setEntityError("Error al crear la entidad")
      logger.error("/superadmin/organizations/[id]", "Error adding entity", err)
    } finally {
      setSavingEntity(false)
    }
  }

  const handleDeleteEntity = async () => {
    if (!entityToDelete) return

    try {
      setIsDeleting(true)
      await deleteEntity(entityToDelete.id)
      await loadData()
      setIsDeleteEntityOpen(false)
      setEntityToDelete(null)
      logger.action("/superadmin/organizations/[id]", "Delete Entity", { organizationId, entity: entityToDelete })
    } catch (err) {
      console.error("[v0] Error deleting entity:", err)
      logger.error("/superadmin/organizations/[id]", "Error deleting entity", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const openEditMember = (member: Profile) => {
    setSelectedMember(member)
    setMemberForm({
      name: member.name,
      email: member.email,
      role: member.role as "admin" | "member",
    })
    setIsEditMemberOpen(true)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Administrador</Badge>
      case "member":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Asesor Jurídico</Badge>
        )
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Organización no encontrada</p>
        <Button variant="outline" onClick={() => router.push("/superadmin/organizations")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/superadmin/organizations")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{organization.name}</h1>
          <p className="text-muted-foreground">NIT: {organization.nit}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entidades</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.filter((m) => m.role === "admin").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Miembros
            </TabsTrigger>
            <TabsTrigger value="entities" className="gap-2">
              <Building2 className="h-4 w-4" />
              Entidades
            </TabsTrigger>
          </TabsList>

          {activeTab === "members" ? (
            <Button onClick={() => setIsAddMemberOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Miembro
            </Button>
          ) : (
            <Button onClick={() => setIsAddEntityOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Entidad
            </Button>
          )}
        </div>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Miembros de la Organización</CardTitle>
              <CardDescription>Gestiona los administradores y asesores jurídicos de esta organización</CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No hay miembros en esta organización</p>
                  <Button className="mt-4" onClick={() => setIsAddMemberOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Primer Miembro
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getRoleBadge(member.role)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditMember(member)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Enviar Invitación
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setMemberToDelete(member)
                                setIsDeleteMemberOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entities Tab */}
        <TabsContent value="entities" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Entidades de la Organización</CardTitle>
              <CardDescription>Gestiona las entidades asociadas a esta organización</CardDescription>
            </CardHeader>
            <CardContent>
              {entities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No hay entidades en esta organización</p>
                  <Button className="mt-4" onClick={() => setIsAddEntityOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primera Entidad
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {entities.map((entity) => (
                    <div key={entity.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{entity.name}</p>
                          <p className="text-sm text-muted-foreground">NIT: {entity.nit}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={entity.status === "active" ? "default" : "secondary"}>
                          {entity.status === "active" ? "Activa" : "Inactiva"}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setEntityToDelete(entity)
                                setIsDeleteEntityOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog
        open={isAddMemberOpen}
        onOpenChange={(open) => {
          setIsAddMemberOpen(open)
          if (open) {
            loadAvailableUsers()
          } else {
            setSearchQuery("")
            setSelectedUserId(null)
            setMemberError(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Miembro</DialogTitle>
            <DialogDescription>
              Selecciona un usuario que no tiene organización asignada para agregarlo a esta organización.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {memberError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{memberError}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="search">Buscar usuario</Label>
              <Input
                id="search"
                placeholder="Buscar por nombre o correo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Usuarios disponibles ({availableUsers.length})</Label>
              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                {availableUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay usuarios sin organización asignada
                  </div>
                ) : (
                  <div className="divide-y">
                    {availableUsers
                      .filter(
                        (user) =>
                          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
                      )
                      .map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className={`w-full p-3 text-left hover:bg-accent transition-colors ${
                            selectedUserId === user.id ? "bg-accent" : ""
                          }`}
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{user.full_name || "Sin nombre"}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                            {selectedUserId === user.id && (
                              <div className="ml-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                <svg
                                  className="h-3 w-3 text-primary-foreground"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M5 13l4 4L19 7"></path>
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={memberForm.role}
                onValueChange={(value: "admin" | "member") => setMemberForm({ ...memberForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="member">Asesor Jurídico</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {memberForm.role === "admin"
                  ? "Los administradores pueden gestionar entidades y miembros"
                  : "Los asesores jurídicos pueden gestionar procesos y documentos"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMember} disabled={savingMember || !selectedUserId}>
              {savingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Agregar Miembro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Miembro</DialogTitle>
            <DialogDescription>Modifica la información del miembro</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {memberError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{memberError}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre completo</Label>
              <Input
                id="edit-name"
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Correo electrónico</Label>
              <Input id="edit-email" type="email" value={memberForm.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">El correo no puede ser modificado</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select
                value={memberForm.role}
                onValueChange={(value: "admin" | "member") => setMemberForm({ ...memberForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="member">Asesor Jurídico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditMemberOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMember} disabled={savingMember}>
              {savingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Entity Dialog */}
      <Dialog open={isAddEntityOpen} onOpenChange={setIsAddEntityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Entidad</DialogTitle>
            <DialogDescription>Crea una nueva entidad para esta organización</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {entityError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{entityError}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="entity-name">Nombre de la entidad</Label>
              <Input
                id="entity-name"
                placeholder="Municipio de..."
                value={entityForm.name}
                onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-nit">NIT</Label>
              <Input
                id="entity-nit"
                placeholder="900.123.456-7"
                value={entityForm.nit}
                onChange={(e) => setEntityForm({ ...entityForm, nit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-rep">Representante Legal</Label>
              <Input
                id="entity-rep"
                placeholder="Nombre del representante"
                value={entityForm.representativeName}
                onChange={(e) => setEntityForm({ ...entityForm, representativeName: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEntityOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddEntity} disabled={savingEntity}>
              {savingEntity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Entidad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation */}
      <Dialog open={isDeleteMemberOpen} onOpenChange={setIsDeleteMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Miembro</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a {memberToDelete?.name}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteMemberOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteMember} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Entity Confirmation */}
      <Dialog open={isDeleteEntityOpen} onOpenChange={setIsDeleteEntityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Entidad</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar {entityToDelete?.name}? Esta acción eliminará todos los procesos y
              documentos asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteEntityOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteEntity} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
