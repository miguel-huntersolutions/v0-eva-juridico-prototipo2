"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Users,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Search,
  Mail,
  X,
  Building,
  Calendar,
  UserPlus,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  LogIn,
  Loader2,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatsCard } from "@/components/stats-card"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  impersonateOrganization,
  createMember,
  type OrganizationMapped,
} from "@/lib/supabase/client-data-access"

// Alias for backward compatibility
type Organization = OrganizationMapped
import { cn } from "@/lib/utils"
import { useImpersonation } from "@/lib/impersonation-context"

type TabFilter = "all" | "active" | "inactive"

interface OrganizationFormData {
  name: string
  nit: string
  phone: string
  address: string
  adminName: string
  adminEmail: string
  status: "active" | "inactive"
}

export function OrganizationsPage() {
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isCreateOrgOpen, setIsCreateOrgOpen] = React.useState(false)
  const [isInviteAdminOpen, setIsInviteAdminOpen] = React.useState(false)
  const [selectedOrg, setSelectedOrg] = React.useState<Organization | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<TabFilter>("all")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")
  const [isImpersonateConfirmOpen, setIsImpersonateConfirmOpen] = React.useState(false)
  const [orgToImpersonate, setOrgToImpersonate] = React.useState<Organization | null>(null)

  // Invite admin form states
  const [inviteAdminForm, setInviteAdminForm] = React.useState({
    name: "",
    email: "",
    message: "",
  })
  const [isSendingInvite, setIsSendingInvite] = React.useState(false)
  const [inviteError, setInviteError] = React.useState<string | null>(null)

  const [isSaving, setIsSaving] = React.useState(false)
  const [formData, setFormData] = React.useState<OrganizationFormData>({
    name: "",
    nit: "",
    phone: "",
    address: "",
    adminName: "",
    adminEmail: "",
    status: "active",
  })
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false)
  const [orgToDelete, setOrgToDelete] = React.useState<Organization | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [activeOrgsThisMonth, setActiveOrgsThisMonth] = React.useState(0)
  const [activeOrgsLastMonth, setActiveOrgsLastMonth] = React.useState(0)

  // Edit organization states
  const [isEditOrgOpen, setIsEditOrgOpen] = React.useState(false)
  const [orgToEdit, setOrgToEdit] = React.useState<Organization | null>(null)
  const [editFormData, setEditFormData] = React.useState<OrganizationFormData>({
    name: "",
    nit: "",
    phone: "",
    address: "",
    adminName: "",
    adminEmail: "",
    status: "active",
  })

  const { startImpersonation } = useImpersonation()
  const router = useRouter()

  const loadOrganizations = React.useCallback(async () => {
    try {
      setIsLoading(true)
      // For superadmin, we need to get ALL organizations, not just active ones
      const { createBrowserClient } = await import("@/lib/supabase/client")
      const supabase = createBrowserClient()
      
      const { data: orgsData, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .order("name")
      
      if (orgsError) {
        console.error("[OrganizationsPage] Error fetching organizations:", orgsError)
        throw orgsError
      }
      
      // Get counts for all organizations
      const organizationsWithCounts = await Promise.all(
        (orgsData || []).map(async (org) => {
          const { count: membersCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id)
          
          const { count: entitiesCount } = await supabase
            .from("entities")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id)
          
          return {
            id: org.id,
            name: org.name,
            nit: org.nit,
            status: org.status,
            createdAt: org.created_at,
            updatedAt: org.updated_at,
            membersCount: membersCount || 0,
            entitiesCount: entitiesCount || 0,
          } as OrganizationMapped
        })
      )
      
      setOrganizations(organizationsWithCounts)
      setError(null)
      
      // Calculate active organizations created this month and last month
      const now = new Date()
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const activeThisMonth = organizationsWithCounts.filter(
        (org) => org.status === "active" && new Date(org.createdAt) >= startOfThisMonth
      ).length
      
      const activeLastMonth = organizationsWithCounts.filter(
        (org) => {
          const createdAt = new Date(org.createdAt)
          return org.status === "active" && createdAt >= startOfLastMonth && createdAt < startOfCurrentMonth
        }
      ).length
      
      setActiveOrgsThisMonth(activeThisMonth)
      setActiveOrgsLastMonth(activeLastMonth)
      
      console.log("[OrganizationsPage] Organizations loaded:", organizationsWithCounts.length)
      console.log("[OrganizationsPage] Active this month:", activeThisMonth, "Active last month:", activeLastMonth)
    } catch (err) {
      console.error("[v0] Error loading organizations:", err)
      setError("Error al cargar las organizaciones")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadOrganizations()
  }, [loadOrganizations])

  const resetForm = () => {
    setFormData({
      name: "",
      nit: "",
      phone: "",
      address: "",
      adminName: "",
      adminEmail: "",
      status: "active",
    })
    setFormError(null)
  }

  const handleCreateOrganization = async () => {
    if (!formData.name.trim()) {
      setFormError("El nombre de la organización es requerido")
      return
    }
    if (!formData.nit.trim()) {
      setFormError("El NIT es requerido")
      return
    }
    if (!formData.adminName.trim()) {
      setFormError("El nombre del administrador es requerido")
      return
    }
    if (!formData.adminEmail.trim()) {
      setFormError("El email del administrador es requerido")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.adminEmail)) {
      setFormError("El email del administrador no es válido")
      return
    }

    try {
      setIsSaving(true)
      setFormError(null)

      // Create the organization
      const newOrg = await createOrganization({
        name: formData.name.trim(),
        nit: formData.nit.trim(),
        status: "active",
      })

      console.log("[OrganizationsPage] Organization created:", newOrg)

      // Create the admin member (this will send the invitation email automatically)
      if (newOrg && newOrg.id) {
        try {
          await createMember({
            email: formData.adminEmail.trim(),
            name: formData.adminName.trim(),
            role: "admin",
            organizationId: newOrg.id,
            isInvitation: true, // Mark as invitation to send email and set status to approved
          })
          console.log("[OrganizationsPage] Admin member created and invitation sent")
        } catch (memberError) {
          console.error("[OrganizationsPage] Error creating admin member:", memberError)
          // Don't fail the whole operation if member creation fails
          // The organization was created successfully
          setFormError(
            "La organización se creó exitosamente, pero hubo un error al crear el administrador. Puedes invitarlo manualmente más tarde."
          )
        }
      }

      await loadOrganizations()

      setIsCreateOrgOpen(false)
      resetForm()
      
      // Show success message
      alert(`Organización "${formData.name}" creada exitosamente. Se ha enviado una invitación a ${formData.adminEmail}`)
    } catch (err) {
      console.error("[v0] Error creating organization:", err)
      setFormError(
        err instanceof Error
          ? err.message
          : "Error al crear la organización. Verifica que el NIT no esté duplicado."
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteOrganization = async () => {
    if (!orgToDelete) return

    try {
      setIsDeleting(true)
      await deleteOrganization(orgToDelete.id)
      await loadOrganizations()
      setIsDeleteConfirmOpen(false)
      setOrgToDelete(null)
    } catch (err) {
      console.error("[v0] Error deleting organization:", err)
      setFormError("Error al eliminar la organización. Puede tener entidades o usuarios asociados.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenDeleteConfirm = (org: Organization) => {
    setOrgToDelete(org)
    setIsDeleteConfirmOpen(true)
  }

  const handleViewDetails = (org: Organization) => {
    router.push(`/superadmin/organizations/${org.id}`)
  }

  const handleInviteAdmin = (org: Organization) => {
    setSelectedOrg(org)
    setInviteAdminForm({ name: "", email: "", message: "" })
    setInviteError(null)
    setIsInviteAdminOpen(true)
  }

  const handleSendAdminInvitation = async () => {
    if (!selectedOrg) return

    if (!inviteAdminForm.name.trim() || !inviteAdminForm.email.trim()) {
      setInviteError("El nombre y el correo electrónico son obligatorios")
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteAdminForm.email)) {
      setInviteError("Por favor ingresa un correo electrónico válido")
      return
    }

    try {
      setIsSendingInvite(true)
      setInviteError(null)

      // Create the admin member (this will send the invitation email automatically)
      await createMember({
        email: inviteAdminForm.email,
        name: inviteAdminForm.name,
        role: "admin",
        organizationId: selectedOrg.id,
        isInvitation: true, // Mark as invitation to send email and set status to approved
      })

      // Reload organizations to update counts
      await loadOrganizations()

      // Close dialog and reset form
      setIsInviteAdminOpen(false)
      setInviteAdminForm({ name: "", email: "", message: "" })
      
      alert(`Invitación enviada exitosamente a ${inviteAdminForm.email}`)
    } catch (err) {
      console.error("[v0] Error sending admin invitation:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al enviar la invitación"
      setInviteError(errorMessage)
    } finally {
      setIsSendingInvite(false)
    }
  }

  const handleImpersonate = (org: Organization) => {
    setOrgToImpersonate(org)
    setIsImpersonateConfirmOpen(true)
  }

  const handleEditOrganization = (org: Organization) => {
    setOrgToEdit(org)
    setEditFormData({
      name: org.name,
      nit: org.nit,
      phone: "",
      address: "",
      adminName: "",
      adminEmail: "",
      status: org.status,
    })
    setFormError(null)
    setIsEditOrgOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!orgToEdit) return

    if (!editFormData.name.trim() || !editFormData.nit.trim()) {
      setFormError("El nombre y el NIT son obligatorios")
      return
    }

    try {
      setIsSaving(true)
      setFormError(null)

      await updateOrganization(orgToEdit.id, {
        name: editFormData.name,
        nit: editFormData.nit,
        status: editFormData.status || "active",
      })

      await loadOrganizations()
      setIsEditOrgOpen(false)
      setOrgToEdit(null)
      setEditFormData({ name: "", nit: "", phone: "", address: "", adminName: "", adminEmail: "", status: "active" })
    } catch (err) {
      console.error("[v0] Error updating organization:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar la organización"
      setFormError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (org: Organization, newStatus: "active" | "inactive") => {
    try {
      await updateOrganization(org.id, { status: newStatus })
      await loadOrganizations()
    } catch (err) {
      console.error("[v0] Error changing organization status:", err)
      setFormError("Error al cambiar el estado de la organización")
    }
  }

  const confirmImpersonation = async () => {
    if (!orgToImpersonate) return

    try {
      await impersonateOrganization(orgToImpersonate.id)
      startImpersonation(orgToImpersonate)
    } catch (err) {
      console.error("[v0] Error impersonating organization:", err)
      setFormError("Error al suplantar la organización.")
    } finally {
      setIsImpersonateConfirmOpen(false)
      setOrgToImpersonate(null)
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setActiveTab("all")
  }

  const stats = {
    total: organizations.length,
    active: organizations.filter((o) => o.status === "active").length,
    inactive: organizations.filter((o) => o.status === "inactive").length,
    totalMembers: organizations.reduce((acc, o) => acc + (o.membersCount || 0), 0),
  }

  const filteredOrganizations = React.useMemo(() => {
    let result = [...organizations]

    if (activeTab !== "all") {
      result = result.filter((o) => o.status === activeTab)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((o) => o.name.toLowerCase().includes(query) || o.nit.toLowerCase().includes(query))
    }

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB
    })

    return result
  }, [organizations, activeTab, searchQuery, sortOrder])

  const hasActiveFilters = searchQuery || activeTab !== "all"

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <PageHeader
          title="Gestión de Organizaciones"
          description="Administra los bufetes y firmas jurídicas registradas en la plataforma"
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-sm text-muted-foreground">Cargando organizaciones...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <PageHeader
          title="Gestión de Organizaciones"
          description="Administra los bufetes y firmas jurídicas registradas en la plataforma"
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        title="Gestión de Organizaciones"
        description="Administra los bufetes y firmas jurídicas registradas en la plataforma"
      >
        <Button onClick={() => setIsCreateOrgOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Organización
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Organizaciones"
          value={stats.total}
          description="Registradas en plataforma"
          icon={Building2}
        />
        <StatsCard
          title="Activas"
          value={stats.active}
          description="Organizaciones operando"
          icon={CheckCircle2}
          trend={
            activeOrgsLastMonth > 0
              ? {
                  value: Math.round(((activeOrgsThisMonth - activeOrgsLastMonth) / activeOrgsLastMonth) * 100),
                  isPositive: activeOrgsThisMonth >= activeOrgsLastMonth,
                }
              : activeOrgsThisMonth > 0
                ? { value: 100, isPositive: true }
                : undefined
          }
        />
        <StatsCard title="Inactivas" value={stats.inactive} description="Organizaciones suspendidas" icon={XCircle} />
        <StatsCard
          title="Total Miembros"
          value={stats.totalMembers}
          description="En todas las organizaciones"
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Organizaciones</CardTitle>
              <CardDescription>
                {filteredOrganizations.length} de {organizations.length} organizaciones
              </CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="active">Activas</TabsTrigger>
                <TabsTrigger value="inactive">Inactivas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o NIT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                {sortOrder === "desc" ? "Más recientes" : "Más antiguas"}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {filteredOrganizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No se encontraron organizaciones</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "Crea una nueva organización para comenzar"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4 bg-transparent" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredOrganizations.map((org) => (
                <Card
                  key={org.id}
                  className={cn(
                    "group cursor-pointer transition-all hover:border-primary/50",
                    org.status === "inactive" && "opacity-60",
                  )}
                  onClick={() => handleViewDetails(org)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold leading-tight">{org.name}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">NIT: {org.nit}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDetails(org)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleInviteAdmin(org)
                            }}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invitar Administrador
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleImpersonate(org)
                            }}
                          >
                            <LogIn className="mr-2 h-4 w-4" />
                            Suplantar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditOrganization(org)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDeleteConfirm(org)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {org.status === "active" ? "Desactivar" : "Eliminar"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{org.membersCount || 0} miembros</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building className="h-4 w-4" />
                        <span>{org.entitiesCount || 0} entidades</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <StatusBadge status={org.status} />
                      <span className="text-xs text-muted-foreground">
                        <Calendar className="mr-1 inline-block h-3 w-3" />
                        {new Date(org.createdAt).toLocaleDateString("es-CO")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isCreateOrgOpen}
        onOpenChange={(open) => {
          setIsCreateOrgOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Nueva Organización</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo bufete o firma jurídica. Se enviará una invitación al administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {formError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>}
            <div className="grid gap-2">
              <Label htmlFor="org-name">Nombre de la Organización *</Label>
              <Input
                id="org-name"
                placeholder="Ej: Bufete Pérez & Asociados"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                disabled={isSaving}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="org-nit">NIT *</Label>
                <Input
                  id="org-nit"
                  placeholder="900.123.456-7"
                  value={formData.nit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nit: e.target.value }))}
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-phone">Teléfono</Label>
                <Input
                  id="org-phone"
                  placeholder="+57 300 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-address">Dirección</Label>
              <Input
                id="org-address"
                placeholder="Calle 100 # 15-20, Bogotá"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                disabled={isSaving}
              />
            </div>
            <div className="border-t pt-4">
              <h4 className="mb-3 text-sm font-medium">Datos del Administrador</h4>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="admin-name">Nombre *</Label>
                    <Input
                      id="admin-name"
                      placeholder="Nombre completo"
                      value={formData.adminName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, adminName: e.target.value }))}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="admin-email">Email *</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@bufete.com"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, adminEmail: e.target.value }))}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOrgOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOrganization} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Crear y Enviar Invitación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Organización</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la organización "{orgToDelete?.name}"? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrganization} disabled={isDeleting}>
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

      <Dialog open={isImpersonateConfirmOpen} onOpenChange={setIsImpersonateConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <LogIn className="h-8 w-8 text-amber-500" />
            </div>
            <DialogTitle className="text-center">Confirmar Suplantación</DialogTitle>
            <DialogDescription className="text-center">
              Estás a punto de ingresar al contexto de la organización{" "}
              <span className="font-semibold text-foreground">{orgToImpersonate?.name}</span>. Podrás ver y gestionar
              todos sus datos como si fueras el administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <Eye className="mt-0.5 h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Modo de Supervisión</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Todas las acciones realizadas durante la suplantación quedarán registradas. Podrás volver a tu
                    sesión en cualquier momento desde el banner superior.
                  </p>
                </div>
              </div>
            </div>
            {orgToImpersonate && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{orgToImpersonate.name}</p>
                  <p className="text-xs text-muted-foreground">
                    NIT: {orgToImpersonate.nit} • {orgToImpersonate.membersCount || 0} miembros •{" "}
                    {orgToImpersonate.entitiesCount || 0} entidades
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsImpersonateConfirmOpen(false)
                setOrgToImpersonate(null)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmImpersonation} className="bg-amber-500 text-amber-950 hover:bg-amber-600">
              <LogIn className="mr-2 h-4 w-4" />
              Iniciar Suplantación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteAdminOpen} onOpenChange={setIsInviteAdminOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar Administrador</DialogTitle>
            <DialogDescription>
              Envía una invitación a un nuevo administrador para{" "}
              <span className="font-medium text-foreground">{selectedOrg?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {inviteError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {inviteError}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="invite-name">Nombre completo *</Label>
              <Input
                id="invite-name"
                placeholder="Nombre del administrador"
                value={inviteAdminForm.name}
                onChange={(e) => setInviteAdminForm({ ...inviteAdminForm, name: e.target.value })}
                disabled={isSendingInvite}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Correo electrónico *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="nuevo.admin@bufete.com"
                value={inviteAdminForm.email}
                onChange={(e) => setInviteAdminForm({ ...inviteAdminForm, email: e.target.value })}
                disabled={isSendingInvite}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-message">Mensaje personalizado (opcional)</Label>
              <Textarea
                id="invite-message"
                placeholder="Escribe un mensaje para incluir en la invitación..."
                rows={3}
                value={inviteAdminForm.message}
                onChange={(e) => setInviteAdminForm({ ...inviteAdminForm, message: e.target.value })}
                disabled={isSendingInvite}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsInviteAdminOpen(false)
                setInviteAdminForm({ name: "", email: "", message: "" })
                setInviteError(null)
              }}
              disabled={isSendingInvite}
            >
              Cancelar
            </Button>
            <Button onClick={handleSendAdminInvitation} disabled={isSendingInvite}>
              {isSendingInvite ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle>{selectedOrg?.name}</DialogTitle>
                <DialogDescription>NIT: {selectedOrg?.nit}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedOrg && (
            <div className="py-4">
              <div className="mb-6 flex items-center gap-3">
                <StatusBadge status={selectedOrg.status} />
                <span className="text-sm text-muted-foreground">
                  Creada el{" "}
                  {new Date(selectedOrg.createdAt).toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Miembros
                  </div>
                  <p className="mt-1 text-2xl font-bold">{selectedOrg.membersCount || 0}</p>
                  <p className="text-xs text-muted-foreground">usuarios activos</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building className="h-4 w-4" />
                    Entidades
                  </div>
                  <p className="mt-1 text-2xl font-bold">{selectedOrg.entitiesCount || 0}</p>
                  <p className="text-xs text-muted-foreground">clientes gestionados</p>
                </div>
              </div>

              <div className="mt-6 border-t pt-6">
                <h4 className="mb-4 text-sm font-medium">Acciones Rápidas</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleInviteAdmin(selectedOrg)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invitar Administrador
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDetailOpen(false)
                      handleEditOrganization(selectedOrg)
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar Datos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive bg-transparent"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {selectedOrg.status === "active" ? "Desactivar" : "Eliminar"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={isEditOrgOpen} onOpenChange={setIsEditOrgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Organización</DialogTitle>
            <DialogDescription>
              Modifica los datos de {orgToEdit?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {formError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-org-name">Nombre *</Label>
              <Input
                id="edit-org-name"
                placeholder="Nombre de la organización"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-org-nit">NIT *</Label>
              <Input
                id="edit-org-nit"
                placeholder="Número de identificación tributaria"
                value={editFormData.nit}
                onChange={(e) => setEditFormData({ ...editFormData, nit: e.target.value })}
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-org-status">Estado *</Label>
              <Select
                value={editFormData.status || "active"}
                onValueChange={(value: "active" | "inactive") =>
                  setEditFormData({ ...editFormData, status: value })
                }
                disabled={isSaving}
              >
                <SelectTrigger id="edit-org-status">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOrgOpen(false)
                setOrgToEdit(null)
                setEditFormData({ name: "", nit: "", phone: "", address: "", adminName: "", adminEmail: "", status: "active" })
                setFormError(null)
              }}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
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
    </div>
  )
}
