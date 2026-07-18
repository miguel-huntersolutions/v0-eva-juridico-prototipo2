"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Mail, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { assignExistingMember, createMember, deleteMember, getOrganizationMembers, getOrganizations, getUsersWithoutOrganization, updateMember, type OrganizationMapped, type Profile } from "@/lib/supabase/client-data-access"
import { logger } from "@/lib/logger"

export function OrganizationMembersPage({ organizationId }: { organizationId: string }) {
  const router = useRouter()
  const [organization, setOrganization] = React.useState<OrganizationMapped | null>(null)
  const [members, setMembers] = React.useState<Profile[]>([])
  const [availableUsers, setAvailableUsers] = React.useState<Profile[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<Profile | null>(null)
  const [memberToDelete, setMemberToDelete] = React.useState<Profile | null>(null)
  const [mode, setMode] = React.useState<"existing" | "new">("existing")
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [form, setForm] = React.useState({ name: "", email: "", role: "member" as "admin" | "member" })
  const [newUserForm, setNewUserForm] = React.useState({ name: "", email: "", role: "member" as "admin" | "member" })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [orgs, membersList] = await Promise.all([getOrganizations(), getOrganizationMembers(organizationId)])
      setOrganization(orgs.find((org) => org.id === organizationId) || null)
      setMembers(membersList)
    } catch (err) {
      logger.error("/superadmin/organizations/[id]/members", "Error loading members", err)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  React.useEffect(() => {
    logger.pageView("/superadmin/organizations/[id]/members", undefined, undefined, { organizationId })
    loadData()
  }, [loadData, organizationId])

  const loadAvailableUsers = async () => {
    try {
      setAvailableUsers(await getUsersWithoutOrganization())
    } catch (err) {
      logger.error("/superadmin/organizations/[id]/members", "Error loading available users", err)
    }
  }

  const resetAddDialog = () => {
    setSelectedUserId(null); setSearchQuery(""); setError(null); setMode("existing")
    setForm({ name: "", email: "", role: "member" }); setNewUserForm({ name: "", email: "", role: "member" })
  }

  const handleAddExisting = async () => {
    if (!selectedUserId) return setError("Debes seleccionar un usuario")
    try {
      setSaving(true); setError(null)
      await assignExistingMember({ userId: selectedUserId, role: form.role, organizationId })
      await loadData(); await loadAvailableUsers(); setAddOpen(false); resetAddDialog()
      logger.action("/superadmin/organizations/[id]/members", "Add Member", undefined, undefined, { organizationId, userId: selectedUserId })
    } catch (err) {
      setError("Error al agregar el miembro. Puede que ya pertenezca a esta organización.")
      logger.error("/superadmin/organizations/[id]/members", "Error adding member", err)
    } finally { setSaving(false) }
  }

  const handleCreateMember = async () => {
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) return setError("Todos los campos son obligatorios")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserForm.email)) return setError("Por favor ingresa un correo electrónico válido")
    try {
      setSaving(true); setError(null)
      await createMember({ ...newUserForm, organizationId })
      await loadData(); setAddOpen(false); resetAddDialog()
      logger.action("/superadmin/organizations/[id]/members", "Create New Member", undefined, undefined, { organizationId, email: newUserForm.email })
    } catch (err) {
      setError("Error al crear el usuario. Es posible que el correo ya esté registrado.")
      logger.error("/superadmin/organizations/[id]/members", "Error creating member", err)
    } finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!selectedMember) return
    try {
      setSaving(true); setError(null)
      await updateMember(selectedMember.id, { name: form.name, role: form.role })
      await loadData(); setEditOpen(false); setSelectedMember(null)
      logger.action("/superadmin/organizations/[id]/members", "Edit Member", undefined, undefined, { organizationId, member: form })
    } catch (err) {
      setError("Error al actualizar el miembro")
      logger.error("/superadmin/organizations/[id]/members", "Error editing member", err)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!memberToDelete) return
    try {
      setSaving(true)
      await deleteMember(memberToDelete.id)
      await loadData(); setDeleteOpen(false); setMemberToDelete(null)
      logger.action("/superadmin/organizations/[id]/members", "Delete Member", undefined, undefined, { organizationId, memberId: memberToDelete.id })
    } catch (err) {
      alert(`Error al eliminar el miembro: ${err instanceof Error ? err.message : "Error desconocido"}`)
      logger.error("/superadmin/organizations/[id]/members", "Error deleting member", err)
    } finally { setSaving(false) }
  }

  const handleSendInvitation = async (member: Profile) => {
    try {
      setSaving(true); setError(null)
      const response = await fetch("/api/send-invitation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: member.id, organizationId }) })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || data.error || "Error al enviar la invitación")
      }
      const result = await response.json()
      alert(result.message || `Invitación enviada exitosamente a ${member.email}`)
      logger.action("/superadmin/organizations/[id]/members", "Send Invitation", undefined, undefined, { organizationId, memberId: member.id })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido al enviar la invitación"
      setError(message); alert(`Error al enviar invitación: ${message}`)
      logger.error("/superadmin/organizations/[id]/members", "Error sending invitation", err)
    } finally { setSaving(false) }
  }

  const roleBadge = (role: string) => role === "admin"
    ? <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Administrador</Badge>
    : <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Asesor Jurídico</Badge>

  if (loading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!organization) return <div className="flex h-[50vh] flex-col items-center justify-center gap-4"><p className="text-muted-foreground">Organización no encontrada</p><Button variant="outline" onClick={() => router.push("/superadmin/organizations")}>Volver</Button></div>

  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:gap-6">
    <Button variant="ghost" size="sm" className="w-fit gap-1.5" onClick={() => router.push(`/superadmin/organizations/${organizationId}`)}><ArrowLeft className="h-4 w-4" />Volver a organización</Button>
    <PageHeader title="Miembros" description={`Gestiona los miembros de ${organization.name}`}><Button className="w-full sm:w-auto" onClick={() => { setAddOpen(true); loadAvailableUsers() }}><Plus className="mr-2 h-4 w-4" />Agregar miembro</Button></PageHeader>
    <Card><CardHeader><CardTitle>Miembros de la organización</CardTitle><CardDescription>Administradores y asesores jurídicos asociados</CardDescription></CardHeader><CardContent>
      {members.length === 0 ? <div className="flex flex-col items-center py-8 text-center"><Users className="h-12 w-12 text-muted-foreground/50" /><p className="mt-4 text-muted-foreground">No hay miembros en esta organización</p><Button className="mt-4 w-full sm:w-auto" onClick={() => { setAddOpen(true); loadAvailableUsers() }}><Plus className="mr-2 h-4 w-4" />Agregar primer miembro</Button></div>
      : <div className="space-y-3">{members.map((member) => <div key={member.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><Avatar><AvatarImage src={member.avatar_url || undefined} /><AvatarFallback>{member.name?.split(" ").map((name) => name[0]).join("").toUpperCase() || "U"}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-medium">{member.name}</p><p className="truncate text-sm text-muted-foreground">{member.email}</p></div></div><div className="flex items-center justify-between gap-2 sm:justify-end">{roleBadge(member.role)}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelectedMember(member); setForm({ name: member.name, email: member.email, role: member.role as "admin" | "member" }); setError(null); setEditOpen(true) }}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem><DropdownMenuItem onClick={() => handleSendInvitation(member)}><Mail className="mr-2 h-4 w-4" />Enviar invitación</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => { setMemberToDelete(member); setDeleteOpen(true) }}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>)}</div>}
    </CardContent></Card>
    <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddDialog() }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Agregar miembro</DialogTitle><DialogDescription>Selecciona un usuario existente o crea uno nuevo.</DialogDescription></DialogHeader><div className="flex gap-2 border-b"><Button variant={mode === "existing" ? "default" : "ghost"} onClick={() => setMode("existing")}>Seleccionar existente</Button><Button variant={mode === "new" ? "default" : "ghost"} onClick={() => setMode("new")}>Crear usuario</Button></div>{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}<div className="space-y-4 py-2">{mode === "existing" ? <><div className="space-y-2"><Label>Buscar usuario</Label><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Nombre o correo..." /></div><div className="max-h-[300px] overflow-y-auto rounded-lg border">{availableUsers.filter((user) => user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email?.toLowerCase().includes(searchQuery.toLowerCase())).map((user) => <button key={user.id} type="button" className={`w-full p-3 text-left hover:bg-accent ${selectedUserId === user.id ? "bg-accent" : ""}`} onClick={() => setSelectedUserId(user.id)}><p className="font-medium">{user.name || "Sin nombre"}</p><p className="text-sm text-muted-foreground">{user.email}</p></button>)}</div><RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} /></> : <><div className="space-y-2"><Label>Nombre completo</Label><Input value={newUserForm.name} onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })} /></div><div className="space-y-2"><Label>Correo electrónico</Label><Input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} /></div><RoleSelect value={newUserForm.role} onChange={(role) => setNewUserForm({ ...newUserForm, role })} /></>}</div><DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button><Button onClick={mode === "existing" ? handleAddExisting : handleCreateMember} disabled={saving || (mode === "existing" && !selectedUserId)}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{mode === "existing" ? "Agregar miembro" : "Crear y agregar"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent><DialogHeader><DialogTitle>Editar miembro</DialogTitle></DialogHeader>{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}<div className="space-y-4 py-2"><div className="space-y-2"><Label>Nombre completo</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>Correo electrónico</Label><Input value={form.email} disabled /></div><RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} /></div><DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button><Button onClick={handleEdit} disabled={saving}>Guardar cambios</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><DialogContent><DialogHeader><DialogTitle>Eliminar miembro</DialogTitle><DialogDescription>¿Eliminar a {memberToDelete?.name}? Esta acción no se puede deshacer.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</Button></DialogFooter></DialogContent></Dialog>
  </div>
}

function RoleSelect({ value, onChange }: { value: "admin" | "member"; onChange: (role: "admin" | "member") => void }) {
  return <div className="space-y-2"><Label>Rol</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="member">Asesor Jurídico</SelectItem></SelectContent></Select></div>
}
