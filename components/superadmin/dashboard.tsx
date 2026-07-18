"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getOrganizations,
  getProcessTypes,
  getTemplates,
  updateOrganization,
  type OrganizationMapped,
  type ProcessType,
  type Template,
} from "@/lib/supabase/client-data-access"
import { useImpersonation } from "@/lib/impersonation-context"

// Alias for backward compatibility
type OrganizationWithCounts = OrganizationMapped

export function SuperadminDashboard() {
  const router = useRouter()
  const { startImpersonation } = useImpersonation()
  const [isCreateOrgOpen, setIsCreateOrgOpen] = React.useState(false)
  const [isEditOrgOpen, setIsEditOrgOpen] = React.useState(false)
  const [selectedOrg, setSelectedOrg] = React.useState<OrganizationWithCounts | null>(null)
  const [editFormData, setEditFormData] = React.useState({ name: "", nit: "", status: "active" as "active" | "inactive" })
  const [isSaving, setIsSaving] = React.useState(false)
  const [editError, setEditError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [organizations, setOrganizations] = React.useState<OrganizationWithCounts[]>([])
  const [processTypes, setProcessTypes] = React.useState<ProcessType[]>([])
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [orgsThisMonth, setOrgsThisMonth] = React.useState(0)
  const [orgsLastMonth, setOrgsLastMonth] = React.useState(0)

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        // For superadmin, we need to get ALL organizations, not just active ones
        // So we'll fetch directly from Supabase
        const { createBrowserClient } = await import("@/lib/supabase/client")
        const supabase = createBrowserClient()
        
        const { data: orgsData, error: orgsError } = await supabase
          .from("organizations")
          .select("*")
          .order("name")
        
        if (orgsError) {
          console.error("[SuperadminDashboard] Error fetching organizations:", orgsError)
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
        
        const [ptData, tplData] = await Promise.all([getProcessTypes(), getTemplates()])
        setOrganizations(organizationsWithCounts)
        setProcessTypes(ptData)
        setTemplates(tplData)
        
        // Calculate organizations created this month and last month
        const now = new Date()
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        const orgsThisMonthCount = organizationsWithCounts.filter(
          (org) => new Date(org.createdAt) >= startOfThisMonth
        ).length
        
        const orgsLastMonthCount = organizationsWithCounts.filter(
          (org) => {
            const createdAt = new Date(org.createdAt)
            return createdAt >= startOfLastMonth && createdAt < startOfCurrentMonth
          }
        ).length
        
        setOrgsThisMonth(orgsThisMonthCount)
        setOrgsLastMonth(orgsLastMonthCount)
        
        console.log("[SuperadminDashboard] Organizations loaded:", organizationsWithCounts.length)
        console.log("[SuperadminDashboard] This month:", orgsThisMonthCount, "Last month:", orgsLastMonthCount)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleEditOrganization = (org: OrganizationWithCounts) => {
    setSelectedOrg(org)
    setEditFormData({
      name: org.name,
      nit: org.nit,
      status: org.status,
    })
    setIsEditOrgOpen(true)
    setEditError(null)
  }

  const handleUpdateOrganization = async () => {
    if (!selectedOrg || !editFormData.name.trim() || !editFormData.nit.trim()) {
      setEditError("Nombre y NIT son requeridos")
      return
    }

    try {
      setIsSaving(true)
      setEditError(null)
      await updateOrganization(selectedOrg.id, {
        name: editFormData.name.trim(),
        nit: editFormData.nit.trim(),
        status: editFormData.status,
      })
      
      // Reload organizations
      const orgsData = await getOrganizations()
      setOrganizations(orgsData)
      
      setIsEditOrgOpen(false)
      setSelectedOrg(null)
    } catch (err) {
      console.error("Error updating organization:", err)
      setEditError("Error al actualizar la organización. Verifica que el NIT no esté duplicado.")
    } finally {
      setIsSaving(false)
    }
  }

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
        <span className="text-sm text-muted-foreground">{new Date(org.createdAt).toLocaleDateString("es-CO")}</span>
      ),
    },
    {
      key: "actions",
      title: "",
      className: "w-10",
          render: (org: OrganizationWithCounts) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Acciones</span>
                </Button>
              </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => startImpersonation(org)}>
              <Eye className="mr-2 h-4 w-4" />
              Suplantar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditOrganization(org)}>
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
    <div className="flex flex-col gap-4 md:gap-8">
      <PageHeader title="Panel de Superadministrador" description="Gestiona la plataforma EVA Jurídico de forma global">
        
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatsCard
          title="Organizaciones"
          value={stats.totalOrgs}
          description={`${stats.activeOrgs} activas`}
          icon={Building2}
          trend={
            orgsLastMonth > 0
              ? {
                  value: Math.round(((orgsThisMonth - orgsLastMonth) / orgsLastMonth) * 100),
                  isPositive: orgsThisMonth >= orgsLastMonth,
                }
              : orgsThisMonth > 0
                ? { value: 100, isPositive: true }
                : undefined
          }
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
        <Card 
          className="group cursor-pointer transition-all hover:border-primary/50"
          onClick={() => router.push("/superadmin/process-types")}
        >
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

        <Card 
          className="group cursor-pointer transition-all hover:border-primary/50"
          onClick={() => router.push("/superadmin/templates")}
        >
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

      {/* Edit Organization Dialog */}
      <Dialog open={isEditOrgOpen} onOpenChange={setIsEditOrgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Organización</DialogTitle>
            <DialogDescription>Modifica los datos de la organización seleccionada</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{editError}</div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-org-name">Nombre de la Organización *</Label>
              <Input
                id="edit-org-name"
                placeholder="Ej: Bufete Pérez & Asociados"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-org-nit">NIT *</Label>
              <Input
                id="edit-org-nit"
                placeholder="Ej: 900.123.456-7"
                value={editFormData.nit}
                onChange={(e) => setEditFormData({ ...editFormData, nit: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-org-status">Estado *</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value: "active" | "inactive") => setEditFormData({ ...editFormData, status: value })}
              >
                <SelectTrigger id="edit-org-status">
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
            <Button variant="outline" onClick={() => setIsEditOrgOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateOrganization} disabled={isSaving || !editFormData.name.trim() || !editFormData.nit.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
