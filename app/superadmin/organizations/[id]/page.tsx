"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
  FileText,
  X,
  Building,
  User,
  Phone,
  ImageIcon,
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
  updateEntity,
  deleteEntity,
  getUsersWithoutOrganization,
  createMember,
  getSecretaries,
  createSecretary,
  updateSecretary,
  deleteSecretary,
  type OrganizationMapped,
  type Profile,
  type Entity,
  type EntityMapped,
  type Secretary,
} from "@/lib/supabase/client-data-access"

// Alias for backward compatibility
type Organization = OrganizationMapped
import { logger } from "@/lib/logger"
import { useState } from "react"

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: organizationId } = React.use(params)
  const pageLoadTime = React.useRef(Date.now())

  const [organization, setOrganization] = React.useState<Organization | null>(null)
  const [members, setMembers] = React.useState<Profile[]>([])
  const [entities, setEntities] = React.useState<EntityMapped[]>([])
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
  const [isEditEntityOpen, setIsEditEntityOpen] = React.useState(false)
  const [selectedEntity, setSelectedEntity] = React.useState<EntityMapped | null>(null)
  const [entityForm, setEntityForm] = React.useState({
    name: "",
    nit: "",
    representativeName: "",
    status: "active" as "active" | "inactive",
    logoUrl: "",
  })
  const [entityLogoFile, setEntityLogoFile] = React.useState<File | null>(null)
  const [entityLogoPreview, setEntityLogoPreview] = React.useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = React.useState(false)
  const [savingEntity, setSavingEntity] = React.useState(false)
  const [entityError, setEntityError] = React.useState<string | null>(null)

  // Delete confirmation
  const [isDeleteMemberOpen, setIsDeleteMemberOpen] = React.useState(false)
  const [memberToDelete, setMemberToDelete] = React.useState<Profile | null>(null)
  const [isDeleteEntityOpen, setIsDeleteEntityOpen] = React.useState(false)
  const [entityToDelete, setEntityToDelete] = React.useState<EntityMapped | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Secretaries dialog state
  const [isSecretariesOpen, setIsSecretariesOpen] = React.useState(false)
  const [secretaryForm, setSecretaryForm] = React.useState<Array<{
    id?: string
    name: string
    secretaryName: string
    email: string
    phone: string
  }>>([{ name: "", secretaryName: "", email: "", phone: "" }])
  const [savingSecretaries, setSavingSecretaries] = React.useState(false)
  const [secretariesError, setSecretariesError] = React.useState<string | null>(null)

  // State for managing member creation mode
  const [memberMode, setMemberMode] = useState<"existing" | "new">("existing")
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    role: "member" as "admin" | "member",
  })

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
      
      // Debug: Log members data
      console.log("[loadData] Members loaded:", membersList)
      console.log("[loadData] Admin count:", membersList.filter((m) => m.role === "admin").length)
      console.log("[loadData] Member roles:", membersList.map((m) => ({ name: m.name, role: m.role })))
      logger.fetch("/superadmin/organizations/[id]", "Organization data", true, Date.now() - startTime)
      logger.pageLoaded("/superadmin/organizations/[id]", Date.now() - pageLoadTime.current)
    } catch (err) {
      logger.error("/superadmin/organizations/[id]", "Error loading organization data", err instanceof Error ? err.message : String(err))
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
      logger.action("/superadmin/organizations/[id]", "Load Available Users", undefined, undefined, { count: users.length })
    } catch (err) {
      console.error("[v0] Error loading available users:", err)
      logger.error("/superadmin/organizations/[id]", err instanceof Error ? err.message : String(err), err)
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
      logger.action("/superadmin/organizations/[id]", "Add Member", undefined, undefined, { organizationId, userId: selectedUserId })
    } catch (err) {
      console.error("[v0] Error adding member:", err)
      setMemberError("Error al agregar el miembro. Puede que ya pertenezca a esta organización.")
      logger.error("/superadmin/organizations/[id]", "Error adding member", err)
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
      logger.action("/superadmin/organizations/[id]", "Edit Member", undefined, undefined, { organizationId, member: memberForm })
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
      logger.action("/superadmin/organizations/[id]", "Delete Member", undefined, undefined, {
        organizationId,
        memberId: memberToDelete.id,
        memberEmail: memberToDelete.email,
      })
    } catch (err) {
      console.error("[v0] Error deleting member:", err)
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al eliminar el miembro"
      alert(`Error al eliminar el miembro: ${errorMessage}`)
      logger.error("/superadmin/organizations/[id]", "Error deleting member", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLogoUpload = async (file: File, entityId?: string): Promise<string | null> => {
    try {
      setUploadingLogo(true)
      const formData = new FormData()
      formData.append("file", file)
      if (entityId) {
        formData.append("entityId", entityId)
      }

      const response = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al subir el logo")
      }

      const data = await response.json()
      return data.url
    } catch (err) {
      console.error("[v0] Error uploading logo:", err)
      setEntityError(err instanceof Error ? err.message : "Error al subir el logo")
      return null
    } finally {
      setUploadingLogo(false)
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

      // Upload logo if provided
      let logoUrl = entityForm.logoUrl
      if (entityLogoFile) {
        const uploadedUrl = await handleLogoUpload(entityLogoFile)
        if (uploadedUrl) {
          logoUrl = uploadedUrl
        } else {
          // If logo upload fails, continue without logo
          console.warn("Logo upload failed, continuing without logo")
        }
      }

      await createEntity({
        name: entityForm.name,
        nit: entityForm.nit,
        representativeName: entityForm.representativeName,
        organizationId,
        status: entityForm.status,
        logoUrl: logoUrl || undefined,
      })
      await loadData()
      setIsAddEntityOpen(false)
      setEntityForm({ name: "", nit: "", representativeName: "", status: "active", logoUrl: "" })
      setEntityLogoFile(null)
      setEntityLogoPreview(null)
      setEntityError(null)
      logger.action("/superadmin/organizations/[id]", "Add Entity", undefined, undefined, { organizationId, entity: entityForm })
    } catch (err) {
      console.error("[v0] Error adding entity:", err)
      setEntityError("Error al crear la entidad")
      logger.error("/superadmin/organizations/[id]", "Error adding entity", err)
    } finally {
      setSavingEntity(false)
    }
  }

  const handleEditEntity = async () => {
    if (!selectedEntity || !entityForm.name || !entityForm.nit) {
      setEntityError("Nombre y NIT son requeridos")
      return
    }

    try {
      setSavingEntity(true)
      setEntityError(null)

      // Upload logo if a new one was selected
      let logoUrl = entityForm.logoUrl
      if (entityLogoFile) {
        const uploadedUrl = await handleLogoUpload(entityLogoFile, selectedEntity.id)
        if (uploadedUrl) {
          logoUrl = uploadedUrl
        } else {
          // If logo upload fails, keep existing logo
          console.warn("Logo upload failed, keeping existing logo")
          // Entity type from client-data-access maps logo_url to logoUrl
          logoUrl = (selectedEntity as any).logoUrl || (selectedEntity as any).logo_url || entityForm.logoUrl
        }
      }

      await updateEntity(selectedEntity.id, {
        name: entityForm.name,
        nit: entityForm.nit,
        representativeName: entityForm.representativeName,
        status: entityForm.status,
        logoUrl: logoUrl || undefined,
      })
      await loadData()
      setIsEditEntityOpen(false)
      setSelectedEntity(null)
      setEntityForm({ name: "", nit: "", representativeName: "", status: "active", logoUrl: "" })
      setEntityLogoFile(null)
      setEntityLogoPreview(null)
      logger.action("/superadmin/organizations/[id]", "Edit Entity", undefined, undefined, { organizationId, entity: entityForm })
    } catch (err) {
      console.error("[v0] Error updating entity:", err)
      setEntityError("Error al actualizar la entidad")
      logger.error("/superadmin/organizations/[id]", "Error editing entity", err)
    } finally {
      setSavingEntity(false)
    }
  }

  const openEditEntity = (entity: EntityMapped) => {
    setSelectedEntity(entity)
    setEntityForm({
      name: entity.name,
      nit: entity.nit,
      representativeName: entity.representativeName,
      status: entity.status as "active" | "inactive",
      logoUrl: entity.logoUrl || "",
    })
    setEntityLogoPreview(entity.logoUrl || null)
    setEntityLogoFile(null)
    setIsEditEntityOpen(true)
    setEntityError(null)
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
      if (!allowedTypes.includes(file.type)) {
        setEntityError("Solo se permiten archivos de imagen (PNG, JPG, GIF, WEBP)")
        return
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setEntityError("El archivo no puede exceder 5MB")
        return
      }

      setEntityLogoFile(file)
      setEntityError(null)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setEntityLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setEntityLogoFile(null)
    setEntityLogoPreview(null)
    setEntityForm({ ...entityForm, logoUrl: "" })
  }

  const handleDeleteEntity = async () => {
    if (!entityToDelete) return

    try {
      setIsDeleting(true)
      await deleteEntity(entityToDelete.id)
      await loadData()
      setIsDeleteEntityOpen(false)
      setEntityToDelete(null)
      logger.action("/superadmin/organizations/[id]", "Delete Entity", undefined, undefined, { organizationId, entity: entityToDelete })
    } catch (err) {
      console.error("[v0] Error deleting entity:", err)
      logger.error("/superadmin/organizations/[id]", "Error deleting entity", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const openSecretariesDialog = async (entity: EntityMapped) => {
    setSelectedEntity(entity)
    
    // Load secretaries from database
    try {
      console.log("[OrganizationsPage] Loading secretaries for entity:", entity.id, entity.name)
      const entitySecretaries = await getSecretaries(entity.id)
      console.log("[OrganizationsPage] Secretaries loaded:", entitySecretaries)
      
      const secretaryForms = entitySecretaries.map((s) => ({
        id: s.id,
        name: s.name,
        secretaryName: s.secretary_name || "",
        email: s.email || "",
        phone: s.phone || "",
      }))

      console.log("[OrganizationsPage] Secretary forms mapped:", secretaryForms)

      setSecretaryForm(
        secretaryForms.length > 0 ? secretaryForms : [{ name: "", secretaryName: "", email: "", phone: "" }]
      )
    } catch (err) {
      console.error("[OrganizationsPage] Error loading secretaries:", err)
      setSecretariesError("Error al cargar las secretarías")
      setSecretaryForm([{ name: "", secretaryName: "", email: "", phone: "" }])
    }
    setIsSecretariesOpen(true)
    setSecretariesError(null)
  }

  const addSecretaryField = () => {
    setSecretaryForm([...secretaryForm, { name: "", secretaryName: "", email: "", phone: "" }])
  }

  const removeSecretaryField = (index: number) => {
    const newSecretaries = secretaryForm.filter((_, i) => i !== index)
    setSecretaryForm(newSecretaries)
  }

  const updateSecretaryField = (index: number, field: string, value: string) => {
    const newSecretaries = [...secretaryForm]
    newSecretaries[index] = { ...newSecretaries[index], [field]: value }
    setSecretaryForm(newSecretaries)
  }

  const handleSaveSecretaries = async () => {
    if (!selectedEntity) return

    try {
      setSavingSecretaries(true)
      setSecretariesError(null)

      // Get existing secretaries for this entity
      const existingSecretaries = await getSecretaries(selectedEntity.id)
      const existingSecretaryIds = existingSecretaries.map((s) => s.id)

      // Process secretaries: create, update, or delete
      const formSecretaryIds: string[] = []
      
      for (const secretaryFormItem of secretaryForm) {
        // Skip empty secretaries
        if (!secretaryFormItem.name && !secretaryFormItem.secretaryName && !secretaryFormItem.email) {
          continue
        }

        // If secretary has an ID, it's an existing one - update it
        if (secretaryFormItem.id) {
          const existingSecretary = existingSecretaries.find((s) => s.id === secretaryFormItem.id)
          if (existingSecretary) {
            // Update existing secretary
            const updated = await updateSecretary(existingSecretary.id, {
              name: secretaryFormItem.name,
              secretaryName: secretaryFormItem.secretaryName,
              email: secretaryFormItem.email,
              phone: secretaryFormItem.phone,
            })
            formSecretaryIds.push(updated.id)
          } else {
            // ID exists but secretary not found - create new one
            const newSecretary = await createSecretary({
              name: secretaryFormItem.name,
              secretaryName: secretaryFormItem.secretaryName,
              email: secretaryFormItem.email,
              phone: secretaryFormItem.phone,
              entityId: selectedEntity.id,
            })
            formSecretaryIds.push(newSecretary.id)
          }
        } else {
          // No ID - this is a new secretary
          const newSecretary = await createSecretary({
            name: secretaryFormItem.name,
            secretaryName: secretaryFormItem.secretaryName,
            email: secretaryFormItem.email,
            phone: secretaryFormItem.phone,
            entityId: selectedEntity.id,
          })
          formSecretaryIds.push(newSecretary.id)
        }
      }

      // Delete secretaries that are no longer in the form
      const secretariesToDelete = existingSecretaries.filter(
        (s) => !formSecretaryIds.includes(s.id)
      )
      for (const secretaryToDelete of secretariesToDelete) {
        await deleteSecretary(secretaryToDelete.id)
      }

      console.log("[OrganizationsPage] Secretaries updated:", {
        created: formSecretaryIds.length - existingSecretaryIds.length,
        updated: formSecretaryIds.filter((id) => existingSecretaryIds.includes(id)).length,
        deleted: secretariesToDelete.length,
      })

      setIsSecretariesOpen(false)
      await loadData()
    } catch (err) {
      console.error("Error saving secretaries:", err)
      setSecretariesError("Error al guardar las secretarías")
    } finally {
      setSavingSecretaries(false)
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

  const handleSendInvitation = async (member: Profile) => {
    try {
      setSavingMember(true)
      setMemberError(null)

      console.log("[handleSendInvitation] Sending invitation to:", member.email, "for organization:", organizationId)

      const response = await fetch("/api/send-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: member.id,
          organizationId,
        }),
      })

      console.log("[handleSendInvitation] Response status:", response.status)

      if (!response.ok) {
        let errorMessage = "Error al enviar la invitación"
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
          console.error("[handleSendInvitation] Error response:", errorData)
        } catch (parseError) {
          const text = await response.text()
          console.error("[handleSendInvitation] Error response (text):", text)
          errorMessage = text || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log("[handleSendInvitation] Success:", result)

      // Show success message
      alert(result.message || `Invitación enviada exitosamente a ${member.email}`)

      logger.action("/superadmin/organizations/[id]", "Send Invitation", undefined, undefined, {
        organizationId,
        memberId: member.id,
        memberEmail: member.email,
      })
    } catch (err) {
      console.error("[handleSendInvitation] Error:", err)
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al enviar la invitación"
      setMemberError(errorMessage)
      alert(`Error al enviar invitación: ${errorMessage}`)
      logger.error("/superadmin/organizations/[id]", "Error sending invitation", err)
    } finally {
      setSavingMember(false)
    }
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

  const handleCreateNewMember = async () => {
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      setMemberError("Todos los campos son obligatorios")
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newUserForm.email)) {
      setMemberError("Por favor ingresa un correo electrónico válido")
      return
    }

    try {
      setSavingMember(true)
      setMemberError(null)

      await createMember({
        email: newUserForm.email,
        name: newUserForm.name,
        role: newUserForm.role,
        organizationId,
      })

      await loadData()
      setIsAddMemberOpen(false)
      setNewUserForm({ name: "", email: "", role: "member" })
      setMemberMode("existing")
      logger.action("/superadmin/organizations/[id]", "Create New Member", undefined, undefined, {
        organizationId,
        email: newUserForm.email,
      })
    } catch (err) {
      console.error("[v0] Error creating member:", err)
      setMemberError("Error al crear el usuario. Es posible que el correo ya esté registrado.")
      // Extract error message safely
      let errorMessage = "Error desconocido"
      if (err instanceof Error) {
        errorMessage = err.message || "Error al crear el usuario"
      } else if (typeof err === "string") {
        errorMessage = err
      } else if (err && typeof err === "object" && "message" in err) {
        errorMessage = String(err.message)
      } else {
        errorMessage = JSON.stringify(err)
      }
      logger.error("/superadmin/organizations/[id]", errorMessage, err, undefined, undefined)
    } finally {
      setSavingMember(false)
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
            <div className="text-2xl font-bold">
              {(() => {
                const adminCount = members.filter((m) => m.role === "admin").length
                console.log("[Admin Count] Total members:", members.length, "Admin count:", adminCount, "Members:", members.map(m => ({ name: m.name, role: m.role })))
                return adminCount
              })()}
            </div>
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
                            <DropdownMenuItem onClick={() => handleSendInvitation(member)}>
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
                            <DropdownMenuItem onClick={() => openEditEntity(entity)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openSecretariesDialog(entity)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Gestionar Secretarías
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
            setMemberMode("existing")
            setNewUserForm({ name: "", email: "", role: "member" })
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Miembro</DialogTitle>
            <DialogDescription>
              Selecciona un usuario existente o crea uno nuevo para agregarlo a esta organización.
            </DialogDescription>
          </DialogHeader>

          {/* Add tabs for switching between existing and new user */}
          <div className="flex gap-2 border-b">
            <button
              type="button"
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                memberMode === "existing"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMemberMode("existing")}
            >
              Seleccionar Existente
            </button>
            <button
              type="button"
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                memberMode === "new"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMemberMode("new")}
            >
              Crear Nuevo Usuario
            </button>
          </div>

          <div className="space-y-4 py-4">
            {memberError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{memberError}</div>
            )}

            {/* Conditional rendering based on mode */}
            {memberMode === "existing" ? (
              <>
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
                              user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                                  <p className="font-medium text-sm">{user.name || "Sin nombre"}</p>
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
              </>
            ) : (
              <>
                {/* New user creation form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newUserName">Nombre completo</Label>
                    <Input
                      id="newUserName"
                      placeholder="Ej: Juan Pérez"
                      value={newUserForm.name}
                      onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newUserEmail">Correo electrónico</Label>
                    <Input
                      id="newUserEmail"
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se enviará una invitación a este correo para configurar su contraseña
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newUserRole">Rol</Label>
                    <Select
                      value={newUserForm.role}
                      onValueChange={(value: "admin" | "member") => setNewUserForm({ ...newUserForm, role: value })}
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
                      {newUserForm.role === "admin"
                        ? "Los administradores pueden gestionar entidades y miembros"
                        : "Los asesores jurídicos pueden gestionar procesos y documentos"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
              Cancelar
            </Button>
            {/* Conditional button based on mode */}
            {memberMode === "existing" ? (
              <Button onClick={handleAddMember} disabled={savingMember || !selectedUserId}>
                {savingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agregar Miembro
              </Button>
            ) : (
              <Button
                onClick={handleCreateNewMember}
                disabled={savingMember || !newUserForm.name.trim() || !newUserForm.email.trim()}
              >
                {savingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear y Agregar
              </Button>
            )}
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
            <div className="space-y-2">
              <Label htmlFor="entity-logo">Logo de la Entidad (Opcional)</Label>
              <div className="space-y-2">
                {entityLogoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={entityLogoPreview}
                      alt="Logo preview"
                      className="h-20 w-auto rounded border object-contain"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="entity-logo-input"
                    className="flex h-20 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Haz clic para subir logo</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG, GIF, WEBP (máx. 5MB)</span>
                    </div>
                    <input
                      id="entity-logo-input"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-status">Estado</Label>
              <Select
                value={entityForm.status}
                onValueChange={(value: "active" | "inactive") => setEntityForm({ ...entityForm, status: value })}
              >
                <SelectTrigger id="entity-status">
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
            <Button variant="outline" onClick={() => setIsAddEntityOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddEntity} disabled={savingEntity || uploadingLogo}>
              {(savingEntity || uploadingLogo) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Entidad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entity Dialog */}
      <Dialog open={isEditEntityOpen} onOpenChange={setIsEditEntityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Entidad</DialogTitle>
            <DialogDescription>Modifica la información de la entidad</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {entityError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{entityError}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-entity-name">Nombre de la entidad</Label>
              <Input
                id="edit-entity-name"
                placeholder="Municipio de..."
                value={entityForm.name}
                onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-entity-nit">NIT</Label>
              <Input
                id="edit-entity-nit"
                placeholder="900.123.456-7"
                value={entityForm.nit}
                onChange={(e) => setEntityForm({ ...entityForm, nit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-entity-rep">Representante Legal</Label>
              <Input
                id="edit-entity-rep"
                placeholder="Nombre del representante"
                value={entityForm.representativeName}
                onChange={(e) => setEntityForm({ ...entityForm, representativeName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-entity-logo">Logo de la Entidad (Opcional)</Label>
              <div className="space-y-2">
                {entityLogoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={entityLogoPreview}
                      alt="Logo preview"
                      className="h-20 w-auto rounded border object-contain"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="edit-entity-logo-input"
                    className="flex h-20 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Haz clic para subir logo</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG, GIF, WEBP (máx. 5MB)</span>
                    </div>
                    <input
                      id="edit-entity-logo-input"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-entity-status">Estado</Label>
              <Select
                value={entityForm.status}
                onValueChange={(value: "active" | "inactive") => setEntityForm({ ...entityForm, status: value })}
              >
                <SelectTrigger id="edit-entity-status">
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
            <Button variant="outline" onClick={() => setIsEditEntityOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditEntity} disabled={savingEntity || uploadingLogo || !entityForm.name.trim() || !entityForm.nit.trim()}>
              {(savingEntity || uploadingLogo) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
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

      {/* Manage Secretaries Dialog */}
      <Dialog open={isSecretariesOpen} onOpenChange={setIsSecretariesOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Gestionar Secretarías</DialogTitle>
            <DialogDescription>
              Administra las secretarías de {selectedEntity?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Secretarías de la Entidad</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Agrega o edita las secretarías y la información de contacto de cada secretario
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={addSecretaryField}>
                  <Plus className="mr-2 h-3 w-3" />
                  Agregar
                </Button>
              </div>

              <div className="space-y-4">
                {secretaryForm.map((secretary, index) => (
                  <Card key={index} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Building className="h-4 w-4 text-primary" />
                          Secretaría {index + 1}
                        </CardTitle>
                        {secretaryForm.length > 1 && (
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
                        <Label htmlFor={`sec-name-${index}`} className="flex items-center gap-2">
                          <Building className="h-3 w-3" />
                          Nombre de la Secretaría *
                        </Label>
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
                          placeholder="Ej: Juan Pérez"
                          value={secretary.secretaryName}
                          onChange={(e) => updateSecretaryField(index, "secretaryName", e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor={`sec-email-${index}`} className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            Correo Electrónico *
                          </Label>
                          <Input
                            id={`sec-email-${index}`}
                            type="email"
                            placeholder="secretario@entidad.gov.co"
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
            </div>
          </div>

          {secretariesError && (
            <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 rounded-md">
              {secretariesError}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSecretariesOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSecretaries} disabled={savingSecretaries}>
              {savingSecretaries && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingSecretaries ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
