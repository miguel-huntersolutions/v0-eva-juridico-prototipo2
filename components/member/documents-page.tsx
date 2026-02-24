"use client"

import * as React from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import {
  FileText,
  Download,
  Eye,
  MoreHorizontal,
  Search,
  X,
  Filter,
  Building,
  Clock,
  CheckCircle2,
  AlertCircle,
  Files,
  History,
  Trash2,
  Copy,
  ExternalLink,
  FolderOpen,
  Loader2,
  Send,
  Check,
  XCircle,
  Pencil,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatsCard } from "@/components/stats-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { documentTypes } from "@/lib/mock-data"
import { DocumentAuditLog } from "@/components/document-audit-log"
import { getEntities, getEntitiesForImpersonation, getDocuments, getDocumentsForImpersonation, type EntityMapped } from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"

type DocumentStatus = "all" | "draft" | "pending" | "in_review" | "approved" | "rejected"

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }
> = {
  draft: { label: "Borrador", variant: "secondary", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  pending: { label: "Pendiente", variant: "outline", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  in_review: {
    label: "En revisión",
    variant: "outline",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  approved: {
    label: "Aprobado",
    variant: "default",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  rejected: { label: "Rechazado", variant: "destructive", className: "bg-red-500/10 text-red-400 border-red-500/20" },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

function getDocumentTypeName(typeId: string): string {
  return documentTypes.find((t) => t.id === typeId)?.name || typeId
}

interface MappedDocument {
  id: string
  processId: string
  processCode: string
  processObject: string
  name: string
  type: string
  version: number
  status: "draft" | "pending" | "in_review" | "approved" | "rejected"
  entityId: string
  entityName: string
  fileUrl: string
  fileSize: number
  createdBy: string
  createdAt: string
  updatedAt: string
  driveFolderUrl?: string | null
}

export function DocumentsPage() {
  const searchParams = useSearchParams()
  const [selectedDocument, setSelectedDocument] = React.useState<MappedDocument | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [auditDocumentId, setAuditDocumentId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<DocumentStatus>("all")
  const [entityFilter, setEntityFilter] = React.useState<string>("all")
  const [processFilter, setProcessFilter] = React.useState<string>("all")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [activeTab, setActiveTab] = React.useState("all")

  const [allDocuments, setAllDocuments] = React.useState<MappedDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = React.useState(true)
  const { profile } = useProfile()
  const { isImpersonating, impersonatedOrg } = useImpersonation()
  const orgId = isImpersonating && impersonatedOrg ? impersonatedOrg.id : profile?.organization_id
  const [entities, setEntities] = React.useState<EntityMapped[]>([])
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)

  // Aplicar filtro por proceso cuando se llega con ?processId=xxx (ej. desde lista de procesos)
  React.useEffect(() => {
    const processId = searchParams.get("processId")
    if (processId) {
      setProcessFilter(processId)
    }
  }, [searchParams])

  React.useEffect(() => {
    async function loadDocuments() {
      if (!orgId) {
        setIsLoadingDocs(false)
        return
      }
      try {
        if (isImpersonating) {
          const mapped = await getDocumentsForImpersonation(orgId)
          setAllDocuments((mapped ?? []) as unknown as MappedDocument[])
        } else {
          const orgEntities = await getEntities(orgId)
          const entityIds = orgEntities.map((e) => e.id)
          const allDocs = await getDocuments()
          const filteredDocs = allDocs.filter((d: any) => {
            const processEntityId = d.process?.entity?.id
            return processEntityId && entityIds.includes(processEntityId)
          })
          const mapped: MappedDocument[] = filteredDocs.map((d) => ({
            id: d.id,
            processId: d.process_id,
            processCode: d.process?.code || "",
            processObject: d.process?.object || "",
            name: d.name,
            type: d.type,
            version: d.version || 1,
            status: d.status as MappedDocument["status"],
            entityId: d.process?.entity?.id || "",
            entityName: d.process?.entity?.name || "",
            fileUrl: d.file_url || "",
            fileSize: d.file_size || 0,
            createdBy: "",
            createdAt: d.created_at?.split("T")[0] || "",
            updatedAt: d.updated_at?.split("T")[0] || "",
            driveFolderUrl: (d.process as any)?.drive_folder_url || null,
          }))
          setAllDocuments(mapped)
        }
      } catch (err) {
      } finally {
        setIsLoadingDocs(false)
      }
    }
    if (orgId) loadDocuments()
  }, [orgId, isImpersonating])

  React.useEffect(() => {
    async function loadEntities() {
      if (!orgId) return
      try {
        const data = isImpersonating ? await getEntitiesForImpersonation(orgId) : await getEntities(orgId)
        setEntities(data)
      } catch (err) {
        console.error("Error loading entities:", err)
      }
    }
    if (orgId) loadEntities()
  }, [orgId, isImpersonating])

  // Filter documents
  const filteredDocuments = React.useMemo(() => {
    return allDocuments.filter((doc) => {
      const matchesSearch =
        searchQuery === "" ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.processCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.processObject.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "approved" && doc.status === "approved") ||
        (activeTab === "pending" && doc.status === "pending") ||
        (activeTab === "in_review" && doc.status === "in_review") ||
        (activeTab === "draft" && doc.status === "draft") ||
        (activeTab === "rejected" && doc.status === "rejected")

      const matchesStatus = statusFilter === "all" || doc.status === statusFilter
      const matchesEntity = entityFilter === "all" || doc.entityId === entityFilter
      const matchesProcess = processFilter === "all" || doc.processId === processFilter
      const matchesType = typeFilter === "all" || doc.type === typeFilter

      return matchesSearch && matchesTab && matchesStatus && matchesEntity && matchesProcess && matchesType
    })
  }, [allDocuments, searchQuery, activeTab, statusFilter, entityFilter, processFilter, typeFilter])

  // Stats
  const stats = {
    total: allDocuments.length,
    approved: allDocuments.filter((d) => d.status === "approved").length,
    pending: allDocuments.filter((d) => d.status === "pending").length,
    in_review: allDocuments.filter((d) => d.status === "in_review").length,
    draft: allDocuments.filter((d) => d.status === "draft").length,
    rejected: allDocuments.filter((d) => d.status === "rejected").length,
  }

  const handleViewDocument = (document: MappedDocument) => {
    setSelectedDocument(document)
    setIsDetailOpen(true)
  }

  const handleSendToReview = async (doc: MappedDocument) => {
    if (doc.status === "pending") {
      alert("Este documento ya está pendiente de revisión")
      return
    }

    if (!confirm(`¿Estás seguro de que deseas enviar "${doc.name}" a revisión?`)) {
      return
    }

    try {
      setIsUpdatingStatus(true)
      
      const response = await fetch("/api/update-document", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: doc.id,
          status: "pending",
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        const errorMsg = responseData?.message || responseData?.error || "Error al enviar el documento a revisión"
        throw new Error(errorMsg)
      }

      // Update local state
      setAllDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, status: "pending" as const } : d
        )
      )

      alert("Documento enviado a revisión exitosamente")
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al enviar el documento a revisión"
      alert(errorMsg)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleReopenAsDraft = async (doc: MappedDocument) => {
    if (doc.status !== "rejected") return
    if (!confirm(`¿Volver "${doc.name}" a borrador para corregirlo? Podrás editarlo y enviarlo de nuevo a revisión.`)) return
    try {
      setIsUpdatingStatus(true)
      const response = await fetch("/api/update-document", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id, status: "draft" }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || data?.message || "Error al volver a borrador")
      setAllDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: "draft" as const } : d))
      )
      alert("Documento en borrador. Puedes ir a Generar documentos del proceso para corregirlo y volver a enviar.")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al volver a borrador")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleUpdateDocumentStatus = async (doc: MappedDocument, newStatus: "approved" | "rejected") => {
    const action = newStatus === "approved" ? "aprobar" : "rechazar"
    if (!confirm(`¿Estás seguro de que deseas ${action} "${doc.name}"?`)) {
      return
    }

    try {
      setIsUpdatingStatus(true)
      const response = await fetch("/api/update-document", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id, status: newStatus }),
      })
      const responseData = await response.json()

      if (!response.ok) {
        const errorMsg = responseData?.message || responseData?.error || `Error al ${action} el documento`
        throw new Error(errorMsg)
      }

      setAllDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: newStatus } : d))
      )
      alert(newStatus === "approved" ? "Documento aprobado. Se indexará en el asistente." : "Documento rechazado.")
    } catch (err) {
      alert(err instanceof Error ? err.message : `Error al ${action} el documento`)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const router = useRouter()
  const pathname = usePathname()

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setEntityFilter("all")
    setProcessFilter("all")
    setTypeFilter("all")
    const processId = searchParams.get("processId")
    if (processId) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("processId")
      router.replace(params.toString() ? `${pathname}?${params}` : pathname)
    }
  }

  const hasActiveFilters =
    statusFilter !== "all" || entityFilter !== "all" || processFilter !== "all" || typeFilter !== "all"

  const filteredByProcessCode = processFilter !== "all"
    ? allDocuments.find((d) => d.processId === processFilter)?.processCode || null
    : null

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <PageHeader
        title="Gestión de Documentos"
        description="Visualiza y administra todos los documentos generados para tus procesos"
      />

      {filteredByProcessCode && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-row items-center justify-between py-3">
            <p className="text-sm">
              Mostrando documentos del proceso <span className="font-mono font-medium">{filteredByProcessCode}</span>
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Ver todos los documentos
            </Button>
          </CardContent>
        </Card>
      )}

      {stats.in_review > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="flex flex-row items-center gap-3 py-3">
            <Clock className="h-5 w-5 text-blue-500" />
            <p className="text-sm">
              Tiene {stats.in_review} documento{stats.in_review !== 1 ? "s" : ""} en revisión. El administrador los está
              revisando; no podrá editarlos ni enviarlos de nuevo hasta que se aprueben o rechacen.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatsCard title="Total Documentos" value={stats.total} description="En todos los procesos" icon={Files} />
        <StatsCard title="Aprobados" value={stats.approved} description="Listos para uso" icon={CheckCircle2} />
        <StatsCard title="Pendientes" value={stats.pending} description="En espera de revisión" icon={Clock} />
        <StatsCard title="En revisión" value={stats.in_review} description="Revisando el admin" icon={Eye} />
        <StatsCard title="Borradores" value={stats.draft} description="En edición" icon={AlertCircle} />
        <StatsCard title="Rechazados" value={stats.rejected} description="Volver a borrador para corregir" icon={XCircle} />
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Biblioteca de Documentos</CardTitle>
              <CardDescription>{filteredDocuments.length} documentos encontrados</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <TabsList>
                <TabsTrigger value="all" className="gap-2">
                  Todos
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {allDocuments.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  Aprobados
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {stats.approved}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  Pendientes
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {stats.pending}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="in_review" className="gap-2">
                  En revisión
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {stats.in_review}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="draft" className="gap-2">
                  Borradores
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {stats.draft}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  Rechazados
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {stats.rejected}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar documentos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-9"
                  />
                </div>

                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-44">
                    <Building className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Entidad" />
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

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-44">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
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

            {/* Table Content */}
            <TabsContent value={activeTab} className="mt-4">
              {isLoadingDocs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold">Documento</TableHead>
                        <TableHead className="font-semibold">Proceso</TableHead>
                        <TableHead className="font-semibold">Entidad</TableHead>
                        <TableHead className="font-semibold">Versión</TableHead>
                        <TableHead className="font-semibold">Estado</TableHead>
                        <TableHead className="font-semibold">Tamaño</TableHead>
                        <TableHead className="font-semibold">Actualizado</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
                              <p>No se encontraron documentos</p>
                              {hasActiveFilters && (
                                <Button variant="link" size="sm" onClick={clearFilters}>
                                  Limpiar filtros
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map((document) => (
                          <TableRow
                            key={document.id}
                            className="cursor-pointer"
                            onClick={() => handleViewDocument(document)}
                          >
                            <TableCell className="w-[420px] max-w-[420px] min-w-0" title={document.name}>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                  <FileText className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  {(() => {
                                    // Check if fileUrl is a valid Google Drive URL (starts with http)
                                    const isValidDriveUrl = document.fileUrl && document.fileUrl.startsWith("http")
                                    const linkUrl = isValidDriveUrl 
                                      ? document.fileUrl 
                                      : (document.driveFolderUrl || null)
                                    const nameClass = "font-medium block truncate"
                                    return linkUrl ? (
                                      <a
                                        href={linkUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className={`text-primary hover:underline ${nameClass}`}
                                        title={document.name}
                                      >
                                        {document.name}
                                      </a>
                                    ) : (
                                      <p className={nameClass} title={document.name}>{document.name}</p>
                                    )
                                  })()}
                                  <p className="text-xs text-muted-foreground truncate">{getDocumentTypeName(document.type)}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="font-mono text-sm font-medium">{document.processCode}</p>
                                <p className="text-xs text-muted-foreground truncate">{document.processObject}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{document.entityName}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                V{document.version}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusConfig[document.status]?.className || ""}>
                                {statusConfig[document.status]?.label || document.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{formatFileSize(document.fileSize)}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {document.updatedAt ? new Date(document.updatedAt).toLocaleDateString("es-CO") : "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setAuditDocumentId(document.id)
                                    }}
                                  >
                                    <History className="mr-2 h-4 w-4" />
                                    Ver auditoría
                                  </DropdownMenuItem>
                                  {(() => {
                                    // Check if fileUrl is a valid Google Drive URL (starts with http)
                                    const isValidDriveUrl = document.fileUrl && document.fileUrl.startsWith("http")
                                    const linkUrl = isValidDriveUrl 
                                      ? document.fileUrl 
                                      : (document.driveFolderUrl || null)
                                    
                                    if (isValidDriveUrl) {
                                      return (
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            window.open(document.fileUrl, "_blank")
                                          }}
                                        >
                                          <ExternalLink className="mr-2 h-4 w-4" />
                                          Ver en Drive
                                        </DropdownMenuItem>
                                      )
                                    } else if (document.driveFolderUrl) {
                                      return (
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            window.open(document.driveFolderUrl!, "_blank")
                                          }}
                                        >
                                          <FolderOpen className="mr-2 h-4 w-4" />
                                          Ver Carpeta en Drive
                                        </DropdownMenuItem>
                                      )
                                    }
                                    return null
                                  })()}
                                  {document.status === "rejected" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleReopenAsDraft(document)
                                        }}
                                        disabled={isUpdatingStatus}
                                      >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Volver a borrador (para corregir)
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {(document.status === "draft" || document.status === "rejected") && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleSendToReview(document)
                                        }}
                                        disabled={isUpdatingStatus}
                                      >
                                        <Send className="mr-2 h-4 w-4" />
                                        Enviar a Revisión
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {document.status === "in_review" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem disabled className="text-muted-foreground">
                                        <Eye className="mr-2 h-4 w-4" />
                                        En revisión (bloqueado)
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination info */}
              {filteredDocuments.length > 0 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {filteredDocuments.length} de {allDocuments.length} documentos
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Auditoría del documento */}
      <Dialog open={!!auditDocumentId} onOpenChange={(open) => !open && setAuditDocumentId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Auditoría del documento</DialogTitle>
          </DialogHeader>
          {auditDocumentId && (
            <DocumentAuditLog documentId={auditDocumentId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
