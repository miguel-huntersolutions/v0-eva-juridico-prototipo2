"use client"

import * as React from "react"
import {
  Building,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Eye,
  Upload,
  FileText,
  X,
  User,
  FileStack,
  Download,
  Check,
  Briefcase,
  Mail,
  Phone,
  Loader2,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatsCard } from "@/components/stats-card"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Badge } from "@/components/ui/badge"
import { mockUsers, mockSecretaries, type Entity } from "@/lib/mock-data"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

import { getEntities, createEntity, updateEntity, deleteEntity } from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"
import { useOrganizationSelector } from "@/hooks/use-organization-selector"
import { useRoleSwitcher } from "@/hooks/use-role-switcher"

interface SecretaryForm {
  name: string
  secretaryName: string
  email: string
  phone: string
}

export function EntitiesPage() {
  const { profile, loading: profileLoading } = useProfile()
  const { effectiveRole, isSuperadmin } = useRoleSwitcher()
  const isSimulatingAdmin = isSuperadmin && effectiveRole === "admin"

  const { effectiveOrganizationId, isLoaded: orgLoaded } = useOrganizationSelector({
    userOrganizationId: profile?.organization_id,
    isSuperadmin,
    isSimulatingAdmin,
  })

  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all")
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  // Added isDeleteOpen state
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isAssignMembersOpen, setIsAssignMembersOpen] = React.useState(false)
  const [selectedEntity, setSelectedEntity] = React.useState<Entity | null>(null)
  const [currentStep, setCurrentStep] = React.useState(1)

  const [entities, setEntities] = React.useState<Entity[]>([])
  // Added loading and saving states
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false) // Added state for detail dialog

  const [formData, setFormData] = React.useState({
    name: "",
    nit: "",
    representativeName: "",
    representativeEmail: "",
    address: "",
    phone: "",
    secretaries: [{ name: "", secretaryName: "", email: "", phone: "" }] as SecretaryForm[],
    logoFile: null as File | null,
    paaFile: null as File | null,
    planFile: null as File | null,
  })

  const members = mockUsers.filter((u) => u.organizationId === "org-1" && u.role === "member")
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>([])

  React.useEffect(() => {
    async function loadEntities() {
      if (!effectiveOrganizationId) return

      try {
        setLoading(true)
        setError(null)
        const data = await getEntities(effectiveOrganizationId)
        setEntities(data)
      } catch (err) {
        console.error("Error loading entities:", err)
        setError("Error al cargar las entidades")
      } finally {
        setLoading(false)
      }
    }

    if (!profileLoading && orgLoaded && effectiveOrganizationId) {
      loadEntities()
    } else if (!profileLoading && orgLoaded && !effectiveOrganizationId) {
      // No organization selected, stop loading
      setLoading(false)
      setError("No hay organización seleccionada")
    }
  }, [effectiveOrganizationId, profileLoading, orgLoaded])

  const filteredEntities = entities.filter((entity) => {
    const matchesSearch =
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.nit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.representativeName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || entity.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: entities.length,
    active: entities.filter((e) => e.status === "active").length,
    inactive: entities.filter((e) => e.status === "inactive").length,
    processes: entities.reduce((acc, e) => acc + e.processesCount, 0),
  }

  const handleCreate = () => {
    const newEntity: Entity = {
      id: `ent-${Date.now()}`,
      name: formData.name,
      nit: formData.nit,
      representativeName: formData.representativeName,
      organizationId: "org-1",
      status: "active",
      processesCount: 0,
      documentsCount: 0,
      logoUrl: formData.logoFile ? URL.createObjectURL(formData.logoFile) : undefined,
      createdAt: new Date().toISOString().split("T")[0],
    }
    setEntities([newEntity, ...entities])
    setIsCreateOpen(false)
    resetForm()
  }

  const handleCreateDB = async () => {
    if (!effectiveOrganizationId) return // Use effectiveOrganizationId

    try {
      setSaving(true)
      setError(null)

      const newEntity = await createEntity({
        name: formData.name,
        nit: formData.nit,
        representativeName: formData.representativeName,
        organizationId: effectiveOrganizationId, // Use effectiveOrganizationId
        logoUrl: formData.logoFile ? URL.createObjectURL(formData.logoFile) : undefined, // This will need to be handled for actual upload
        status: "active", // Default status
      })

      setEntities([newEntity, ...entities])
      setIsCreateOpen(false)
      resetForm()
    } catch (err) {
      console.error("Error creating entity:", err)
      setError("Error al crear la entidad")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = () => {
    if (!selectedEntity) return
    const updatedEntities = entities.map((entity) => {
      if (entity.id === selectedEntity.id) {
        return {
          ...entity,
          name: formData.name,
          nit: formData.nit,
          representativeName: formData.representativeName,
          logoUrl: formData.logoFile ? URL.createObjectURL(formData.logoFile) : entity.logoUrl,
        }
      }
      return entity
    })
    setEntities(updatedEntities)
    setIsEditOpen(false)
    resetForm()
  }

  const handleEditDB = async () => {
    if (!selectedEntity) return

    try {
      setSaving(true)
      setError(null)

      const updatedEntity = await updateEntity(selectedEntity.id, {
        name: formData.name,
        nit: formData.nit,
        representativeName: formData.representativeName,
        logoUrl: formData.logoFile ? URL.createObjectURL(formData.logoFile) : undefined, // Handle actual upload
      })

      setEntities(entities.map((e) => (e.id === selectedEntity.id ? updatedEntity : e)))
      setIsEditOpen(false)
      resetForm()
    } catch (err) {
      console.error("Error updating entity:", err)
      setError("Error al actualizar la entidad")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (entity: Entity) => {
    console.log("Deleting entity:", entity)
    setEntities(entities.filter((e) => e.id !== entity.id))
  }

  const handleDeleteDB = async () => {
    if (!selectedEntity) return

    try {
      setSaving(true)
      setError(null)

      await deleteEntity(selectedEntity.id)
      setEntities(entities.filter((e) => e.id !== selectedEntity.id))
      setIsDeleteOpen(false)
      setSelectedEntity(null)
    } catch (err) {
      console.error("Error deleting entity:", err)
      setError("Error al eliminar la entidad")
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      nit: "",
      representativeName: "",
      representativeEmail: "",
      address: "",
      phone: "",
      secretaries: [{ name: "", secretaryName: "", email: "", phone: "" }],
      logoFile: null,
      paaFile: null,
      planFile: null,
    })
    setCurrentStep(1)
    setSelectedMembers([]) // Reset selected members as well
  }

  const openEditDialog = (entity: Entity) => {
    setSelectedEntity(entity)
    const entitySecretaries = mockSecretaries
      .filter((s) => s.entityId === entity.id)
      .map((s) => ({
        name: s.name,
        secretaryName: s.secretaryName,
        email: s.email,
        phone: s.phone,
      }))

    setFormData({
      name: entity.name,
      nit: entity.nit,
      representativeName: entity.representativeName,
      representativeEmail: "representante@entidad.gov.co", // Placeholder, needs to be fetched or set
      address: "Calle 123 #45-67, Bogotá", // Placeholder, needs to be fetched or set
      phone: "+57 1 234 5678", // Placeholder, needs to be fetched or set
      secretaries:
        entitySecretaries.length > 0 ? entitySecretaries : [{ name: "", secretaryName: "", email: "", phone: "" }],
      logoFile: null,
      paaFile: null,
      planFile: null,
    })
    setIsEditOpen(true)
  }

  const openDetailDialog = (entity: Entity) => {
    setSelectedEntity(entity)
    setIsDetailOpen(true) // Set the state for the detail dialog
  }

  const openAssignDialog = (entity: Entity) => {
    setSelectedEntity(entity)
    setSelectedMembers(["3", "4"]) // Mock pre-selected members
    setIsAssignMembersOpen(true)
  }

  // Added openDeleteDialog
  const openDeleteDialog = (entity: Entity) => {
    setSelectedEntity(entity)
    setIsDeleteOpen(true)
  }

  const addSecretaryField = () => {
    setFormData({
      ...formData,
      secretaries: [...formData.secretaries, { name: "", secretaryName: "", email: "", phone: "" }],
    })
  }

  const removeSecretaryField = (index: number) => {
    const newSecretaries = formData.secretaries.filter((_, i) => i !== index)
    setFormData({ ...formData, secretaries: newSecretaries })
  }

  const updateSecretaryField = (index: number, field: keyof SecretaryForm, value: string) => {
    const newSecretaries = [...formData.secretaries]
    newSecretaries[index] = { ...newSecretaries[index], [field]: value }
    setFormData({ ...formData, secretaries: newSecretaries })
  }

  const handleFileUpload = (field: "logoFile" | "paaFile" | "planFile", file: File | null) => {
    setFormData({ ...formData, [field]: file })
  }

  const toggleMember = (memberId: string) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== memberId))
    } else {
      setSelectedMembers([...selectedMembers, memberId])
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 pb-6">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                currentStep === step
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {currentStep > step ? <Check className="h-4 w-4" /> : step}
            </div>
            <span className="text-sm font-medium hidden sm:inline">
              {step === 1 ? "Información" : step === 2 ? "Documentos" : "Secretarías"}
            </span>
          </div>
          {step < 3 && <div className="h-[2px] w-8 bg-border" />}
        </React.Fragment>
      ))}
    </div>
  )

  if (loading || profileLoading || !orgLoaded) {
    // Added !orgLoaded to the condition
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!effectiveOrganizationId) {
    // Handle case where no organization is selected
    return (
      <div className="flex h-full items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Selecciona una Organización</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Por favor, selecciona una organización del selector para continuar.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        title="Gestión de Entidades"
        description="Administra los clientes de tu organización"
        action={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Entidad
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Entidades" value={stats.total} description="Clientes registrados" icon={Building} />
        <StatsCard
          title="Activas"
          value={stats.active}
          description="Entidades operativas"
          icon={Building}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard title="Inactivas" value={stats.inactive} description="Entidades pausadas" icon={Building} />
        <StatsCard
          title="Procesos Totales"
          value={stats.processes}
          description="En todas las entidades"
          icon={Briefcase}
        />
      </div>

      {/* Filters and Tabs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Entidades</CardTitle>
              <CardDescription>Listado completo de clientes gestionados</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar entidad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px] lg:w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">Todas ({stats.total})</TabsTrigger>
              <TabsTrigger value="active">Activas ({stats.active})</TabsTrigger>
              <TabsTrigger value="inactive">Inactivas ({stats.inactive})</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEntities.map((entity) => (
                  <Card key={entity.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Building className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{entity.name}</CardTitle>
                            <CardDescription className="text-xs">NIT: {entity.nit}</CardDescription>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailDialog(entity)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(entity)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAssignDialog(entity)}>
                              <Users className="mr-2 h-4 w-4" />
                              Asignar Miembros
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(entity)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="line-clamp-1">{entity.representativeName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="gap-1">
                          <Briefcase className="h-3 w-3" />
                          {entity.processesCount} procesos
                        </Badge>
                        <StatusBadge status={entity.status} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Entity Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="h-[90vh] flex flex-col overflow-hidden max-w-2xl">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Crear Nueva Entidad</DialogTitle>
            <DialogDescription>Registra un nuevo cliente para tu organización</DialogDescription>
          </DialogHeader>

          {renderStepIndicator()}

          <div className="flex-1 overflow-y-auto px-1">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nombre de la Entidad *</Label>
                    <Input
                      id="name"
                      placeholder="Ej: Alcaldía de Medellín"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nit">NIT *</Label>
                      <Input
                        id="nit"
                        placeholder="899.999.XXX-X"
                        value={formData.nit}
                        onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        placeholder="+57 1 234 5678"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      placeholder="Calle 123 #45-67, Bogotá"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="rep-name">Representante Legal *</Label>
                      <Input
                        id="rep-name"
                        placeholder="Nombre completo"
                        value={formData.representativeName}
                        onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="rep-email">Correo del Representante</Label>
                      <Input
                        id="rep-email"
                        type="email"
                        placeholder="representante@entidad.gov.co"
                        value={formData.representativeEmail}
                        onChange={(e) => setFormData({ ...formData, representativeEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Documents */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Logo de la Entidad</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload("logoFile", e.target.files?.[0] || null)}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => document.getElementById("logo-upload")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {formData.logoFile ? formData.logoFile.name : "Seleccionar archivo"}
                      </Button>
                      {formData.logoFile && (
                        <Button variant="ghost" size="icon" onClick={() => handleFileUpload("logoFile", null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Se usará en los documentos generados (PNG, JPG max 2MB)
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Plan Anual de Adquisiciones (PAA)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileUpload("paaFile", e.target.files?.[0] || null)}
                        className="hidden"
                        id="paa-upload"
                      />
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => document.getElementById("paa-upload")?.click()}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {formData.paaFile ? formData.paaFile.name : "Seleccionar PAA"}
                      </Button>
                      {formData.paaFile && (
                        <Button variant="ghost" size="icon" onClick={() => handleFileUpload("paaFile", null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      La IA usará este documento para contexto (PDF, Word)
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Plan de Desarrollo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileUpload("planFile", e.target.files?.[0] || null)}
                        className="hidden"
                        id="plan-upload"
                      />
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => document.getElementById("plan-upload")?.click()}
                      >
                        <FileStack className="mr-2 h-4 w-4" />
                        {formData.planFile ? formData.planFile.name : "Seleccionar Plan"}
                      </Button>
                      {formData.planFile && (
                        <Button variant="ghost" size="icon" onClick={() => handleFileUpload("planFile", null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Para alinear justificaciones con objetivos (PDF, Word)
                    </p>
                  </div>
                </div>

                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Documentos de Contexto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    <p>El logo se incluirá automáticamente en los documentos generados</p>
                    <p>El PAA y Plan de Desarrollo ayudan a la IA a generar justificaciones alineadas</p>
                    <p>Puedes actualizar estos documentos en cualquier momento</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Secretarías de la Entidad</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Agrega las secretarías y la información de contacto de cada secretario
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addSecretaryField}>
                    <Plus className="mr-2 h-3 w-3" />
                    Agregar
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.secretaries.map((secretary, index) => (
                    <Card key={index} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            Secretaría {index + 1}
                          </CardTitle>
                          {formData.secretaries.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeSecretaryField(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor={`sec-name-${index}`}>Nombre de la Secretaría *</Label>
                          <Input
                            id={`sec-name-${index}`}
                            placeholder="Ej: Secretaría de Hacienda"
                            value={secretary.name}
                            onChange={(e) => updateSecretaryField(index, "name", e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`sec-person-${index}`} className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Nombre del Secretario *
                          </Label>
                          <Input
                            id={`sec-person-${index}`}
                            placeholder="Ej: Carlos Andrés Pérez"
                            value={secretary.secretaryName}
                            onChange={(e) => updateSecretaryField(index, "secretaryName", e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor={`sec-email-${index}`} className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              Correo Electrónico
                            </Label>
                            <Input
                              id={`sec-email-${index}`}
                              type="email"
                              placeholder="secretaria@entidad.gov.co"
                              value={secretary.email}
                              onChange={(e) => updateSecretaryField(index, "email", e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`sec-phone-${index}`} className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              Teléfono
                            </Label>
                            <Input
                              id={`sec-phone-${index}`}
                              placeholder="+57 1 234 5678"
                              value={secretary.phone}
                              onChange={(e) => updateSecretaryField(index, "phone", e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-xs text-muted-foreground">
                    <p>
                      Las secretarías representan las áreas de la entidad que supervisan procesos contractuales. La
                      información del secretario permite enviar notificaciones y coordinar los procesos.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            {currentStep > 1 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                Anterior
              </Button>
            )}
            {currentStep < 3 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)}>Siguiente</Button>
            ) : (
              <Button onClick={handleCreateDB}>Crear Entidad</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entity Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="h-[90vh] flex flex-col overflow-hidden max-w-2xl">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Editar Entidad</DialogTitle>
            <DialogDescription>Actualiza la información de {selectedEntity?.name}</DialogDescription>
          </DialogHeader>

          {renderStepIndicator()}

          <div className="flex-1 overflow-y-auto px-1">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Nombre de la Entidad *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-nit">NIT *</Label>
                      <Input
                        id="edit-nit"
                        value={formData.nit}
                        onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-phone">Teléfono</Label>
                      <Input
                        id="edit-phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-address">Dirección</Label>
                    <Input
                      id="edit-address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-rep-name">Representante Legal *</Label>
                      <Input
                        id="edit-rep-name"
                        value={formData.representativeName}
                        onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-rep-email">Correo del Representante</Label>
                      <Input
                        id="edit-rep-email"
                        type="email"
                        value={formData.representativeEmail}
                        onChange={(e) => setFormData({ ...formData, representativeEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Documents */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Logo de la Entidad</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload("logoFile", e.target.files?.[0] || null)}
                        className="hidden"
                        id="edit-logo-upload"
                      />
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => document.getElementById("edit-logo-upload")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {formData.logoFile ? formData.logoFile.name : "Seleccionar nuevo logo"}
                      </Button>
                      {formData.logoFile && (
                        <Button variant="ghost" size="icon" onClick={() => handleFileUpload("logoFile", null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {!formData.logoFile && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary" />
                        <span>Logo actual: logo-alcaldia.png</span>
                        <Button variant="ghost" size="sm" className="h-6 gap-1">
                          <Download className="h-3 w-3" />
                          Descargar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label>Plan Anual de Adquisiciones (PAA)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileUpload("paaFile", e.target.files?.[0] || null)}
                        className="hidden"
                        id="edit-paa-upload"
                      />
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => document.getElementById("edit-paa-upload")?.click()}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {formData.paaFile ? formData.paaFile.name : "Reemplazar PAA"}
                      </Button>
                      {formData.paaFile && (
                        <Button variant="ghost" size="icon" onClick={() => handleFileUpload("paaFile", null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {!formData.paaFile && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary" />
                        <span>PAA actual: paa-2024.pdf</span>
                        <Button variant="ghost" size="sm" className="h-6 gap-1">
                          <Download className="h-3 w-3" />
                          Descargar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label>Plan de Desarrollo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileUpload("planFile", e.target.files?.[0] || null)}
                        className="hidden"
                        id="edit-plan-upload"
                      />
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => document.getElementById("edit-plan-upload")?.click()}
                      >
                        <FileStack className="mr-2 h-4 w-4" />
                        {formData.planFile ? formData.planFile.name : "Reemplazar Plan"}
                      </Button>
                      {formData.planFile && (
                        <Button variant="ghost" size="icon" onClick={() => handleFileUpload("planFile", null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {!formData.planFile && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary" />
                        <span>Plan actual: plan-desarrollo-2024-2027.pdf</span>
                        <Button variant="ghost" size="sm" className="h-6 gap-1">
                          <Download className="h-3 w-3" />
                          Descargar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Secretarías de la Entidad</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Edita las secretarías y la información de contacto de cada secretario
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addSecretaryField}>
                    <Plus className="mr-2 h-3 w-3" />
                    Agregar
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.secretaries.map((secretary, index) => (
                    <Card key={index} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            Secretaría {index + 1}
                          </CardTitle>
                          {formData.secretaries.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeSecretaryField(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor={`edit-sec-name-${index}`}>Nombre de la Secretaría *</Label>
                          <Input
                            id={`edit-sec-name-${index}`}
                            placeholder="Ej: Secretaría de Hacienda"
                            value={secretary.name}
                            onChange={(e) => updateSecretaryField(index, "name", e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`edit-sec-person-${index}`} className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Nombre del Secretario *
                          </Label>
                          <Input
                            id={`edit-sec-person-${index}`}
                            placeholder="Ej: Carlos Andrés Pérez"
                            value={secretary.secretaryName}
                            onChange={(e) => updateSecretaryField(index, "secretaryName", e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor={`edit-sec-email-${index}`} className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              Correo Electrónico
                            </Label>
                            <Input
                              id={`edit-sec-email-${index}`}
                              type="email"
                              placeholder="secretaria@entidad.gov.co"
                              value={secretary.email}
                              onChange={(e) => updateSecretaryField(index, "email", e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`edit-sec-phone-${index}`} className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              Teléfono
                            </Label>
                            <Input
                              id={`edit-sec-phone-${index}`}
                              placeholder="+57 1 234 5678"
                              value={secretary.phone}
                              onChange={(e) => updateSecretaryField(index, "phone", e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-xs text-muted-foreground">
                    <p>
                      Las secretarías representan las áreas de la entidad que supervisan procesos contractuales. La
                      información del secretario permite enviar notificaciones y coordinar los procesos.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            {currentStep > 1 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                Anterior
              </Button>
            )}
            {currentStep < 3 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)}>Siguiente</Button>
            ) : (
              <Button onClick={handleEditDB}>Guardar Cambios</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building className="h-5 w-5 text-primary" />
              </div>
              {selectedEntity?.name}
            </DialogTitle>
            <DialogDescription>Información detallada de la entidad</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 px-1">
            <div className="space-y-6 pr-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">NIT:</span>
                      <p className="font-medium">{selectedEntity?.nit}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Representante Legal:</span>
                      <p className="font-medium">{selectedEntity?.representativeName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estado:</span>
                      <div className="mt-1">
                        <StatusBadge status={selectedEntity?.status || "active"} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Contacto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Teléfono:</span>
                      <p className="font-medium">+57 1 234 5678</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">contacto@entidad.gov.co</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dirección:</span>
                      <p className="font-medium">Calle 123 #45-67, Bogotá</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Secretarías</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockSecretaries
                    .filter((s) => s.entityId === selectedEntity?.id)
                    .map((secretary) => (
                      <div key={secretary.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{secretary.name}</p>
                          <Badge variant="outline" className="text-xs">
                            Activa
                          </Badge>
                        </div>
                        <div className="grid gap-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>{secretary.secretaryName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span>{secretary.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            <span>{secretary.phone}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Documentos de Contexto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Logo</p>
                        <p className="text-xs text-muted-foreground">logo-alcaldia.png</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium">PAA 2024</p>
                        <p className="text-xs text-muted-foreground">paa-2024.pdf • 2.3 MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <FileStack className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Plan de Desarrollo 2024-2027</p>
                        <p className="text-xs text-muted-foreground">plan-desarrollo.pdf • 5.1 MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Estadísticas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-primary">{selectedEntity?.processesCount}</p>
                      <p className="text-xs text-muted-foreground">Procesos Totales</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-amber-500">
                        {Math.floor((selectedEntity?.processesCount || 0) * 0.4)}
                      </p>
                      <p className="text-xs text-muted-foreground">En Progreso</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-emerald-500">
                        {Math.floor((selectedEntity?.processesCount || 0) * 0.6)}
                      </p>
                      <p className="text-xs text-muted-foreground">Completados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                setIsDetailOpen(false)
                if (selectedEntity) openEditDialog(selectedEntity)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Members Dialog */}
      <Dialog open={isAssignMembersOpen} onOpenChange={setIsAssignMembersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Miembros</DialogTitle>
            <DialogDescription>Selecciona los miembros que tendrán acceso a {selectedEntity?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleMember(member.id)}
              >
                <Checkbox checked={selectedMembers.includes(member.id)} />
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignMembersOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsAssignMembersOpen(false)}>Guardar Asignaciones</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
