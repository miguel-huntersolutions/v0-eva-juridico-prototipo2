"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
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
  Check,
  XCircle,
  Send,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { documentTypes } from "@/lib/mock-data"
import { getEntities, type EntityMapped } from "@/lib/supabase/client-data-access"
import { DocumentAuditLog } from "@/components/document-audit-log"
import { useProfile } from "@/hooks/use-profile"
import { useOrganizationSelector } from "@/hooks/use-organization-selector"
import { useRoleSwitcher } from "@/hooks/use-role-switcher"
import { cn } from "@/lib/utils"

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
  const { profile } = useProfile()
  const { actualRole } = useRoleSwitcher(profile?.role)
  const isSuperadmin = actualRole === "superadmin"
  const {
    effectiveOrganizationId,
    isLoaded: orgLoaded,
  } = useOrganizationSelector({
    userOrganizationId: profile?.organization_id,
    isSuperadmin,
    isSimulatingAdmin: false,
  })

  const [selectedDocument, setSelectedDocument] = React.useState<MappedDocument | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = React.useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false)
  const [approvalComment, setApprovalComment] = React.useState("")
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<DocumentStatus>("all")
  const [entityFilter, setEntityFilter] = React.useState<string>("all")
  const [processFilter, setProcessFilter] = React.useState<string>("all")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [activeTab, setActiveTab] = React.useState("pending")

  // Aplicar filtro por proceso cuando se llega con ?processId=xxx (ej. desde lista de procesos)
  React.useEffect(() => {
    const processId = searchParams.get("processId")
    if (processId) setProcessFilter(processId)
  }, [searchParams])

  const [allDocuments, setAllDocuments] = React.useState<MappedDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = React.useState(true)
  const [entities, setEntities] = React.useState<EntityMapped[]>([])

  React.useEffect(() => {
    async function loadDocuments() {
      if (!effectiveOrganizationId || !orgLoaded) {
        setIsLoadingDocs(false)
        return
      }

      try {
        const res = await fetch(
          `/api/documents?organizationId=${encodeURIComponent(effectiveOrganizationId)}`
        )
        if (!res.ok) {
          throw new Error(await res.text())
        }
        const list = (await res.json()) as Array<{
          id: string
          processId: string
          processCode: string
          processObject: string
          name: string
          type: string
          version: number
          status: string
          entityId: string
          entityName: string
          fileUrl: string
          fileSize: number
          createdAt: string
          updatedAt: string
          driveFolderUrl?: string | null
        }>

        const mapped: MappedDocument[] = list.map((d) => {
          const rawStatus = d.status == null ? "draft" : String(d.status).toLowerCase().trim()
          const status = ["draft", "pending", "in_review", "approved", "rejected"].includes(rawStatus)
            ? (rawStatus as MappedDocument["status"])
            : "draft"
          return {
            id: d.id,
            processId: d.processId,
            processCode: d.processCode,
            processObject: d.processObject,
            name: d.name,
            type: d.type,
            version: d.version ?? 1,
            status,
            entityId: d.entityId,
            entityName: d.entityName,
            fileUrl: d.fileUrl ?? "",
            fileSize: d.fileSize ?? 0,
            createdBy: "",
            createdAt: d.createdAt ?? "",
            updatedAt: d.updatedAt ?? "",
            driveFolderUrl: d.driveFolderUrl ?? null,
          }
        })
        setAllDocuments(mapped)
      } catch (err) {
        console.error("Error loading documents:", err)
      } finally {
        setIsLoadingDocs(false)
      }
    }
    if (effectiveOrganizationId && orgLoaded) {
      loadDocuments()
    }
  }, [effectiveOrganizationId, orgLoaded])

  React.useEffect(() => {
    async function loadEntities() {
      if (!effectiveOrganizationId || !orgLoaded) return
      try {
        const data = await getEntities(effectiveOrganizationId)
        setEntities(data)
      } catch (err) {
        console.error("Error loading entities:", err)
      }
    }
    if (effectiveOrganizationId && orgLoaded) {
      loadEntities()
    }
  }, [effectiveOrganizationId, orgLoaded])

  // Filter documents - Show all documents, but default to pending
  const filteredDocuments = React.useMemo(() => {
    // Apply all filters
    const filtered = allDocuments.filter((doc) => {
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
    
    console.log("[AdminDocumentsPage] Filtering:", {
      totalDocuments: allDocuments.length,
      activeTab,
      statusFilter,
      entityFilter,
      processFilter,
      typeFilter,
      searchQuery,
      filteredCount: filtered.length,
      documentStatuses: allDocuments.map(d => d.status),
    })
    
    return filtered
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

  const handleApprove = async () => {
    if (!selectedDocument) return

    try {
      setIsUpdating(true)
      const response = await fetch("/api/update-document", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: selectedDocument.id,
          status: "approved",
          comment: approvalComment,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al aprobar el documento")
      }

      // Update local state
      setAllDocuments((prev) =>
        prev.map((doc) =>
          doc.id === selectedDocument.id ? { ...doc, status: "approved" as const } : doc
        )
      )

      setIsApproveDialogOpen(false)
      setIsDetailOpen(false)
      setApprovalComment("")
      setSelectedDocument(null)
    } catch (error) {
      console.error("Error approving document:", error)
      alert(error instanceof Error ? error.message : "Error al aprobar el documento")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReject = async () => {
    if (!selectedDocument) return

    try {
      setIsUpdating(true)
      const response = await fetch("/api/update-document", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: selectedDocument.id,
          status: "rejected",
          comment: approvalComment,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al rechazar el documento")
      }

      // Update local state
      setAllDocuments((prev) =>
        prev.map((doc) =>
          doc.id === selectedDocument.id ? { ...doc, status: "rejected" as const } : doc
        )
      )

      setIsRejectDialogOpen(false)
      setIsDetailOpen(false)
      setApprovalComment("")
      setSelectedDocument(null)
    } catch (error) {
      console.error("Error rejecting document:", error)
      alert(error instanceof Error ? error.message : "Error al rechazar el documento")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleMoveToInReview = async (doc: MappedDocument) => {
    if (doc.status !== "pending") return
    if (!confirm(`¿Pasar "${doc.name}" a estado "En revisión"? El miembro no podrá editarlo hasta que lo apruebes o rechaces.`)) return
    try {
      setIsUpdating(true)
      const response = await fetch("/api/update-document", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id, status: "in_review" }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || err.error || "Error al pasar a revisión")
      }
      setAllDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: "in_review" as const } : d))
      )
      setSelectedDocument((prev) => (prev?.id === doc.id ? { ...prev, status: "in_review" as const } : prev))
    } catch (error) {
      console.error("Error moving to in_review:", error)
      alert(error instanceof Error ? error.message : "Error al pasar a revisión")
    } finally {
      setIsUpdating(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setEntityFilter("all")
    setProcessFilter("all")
    setTypeFilter("all")
  }

  const hasActiveFilters =
    statusFilter !== "all" || entityFilter !== "all" || processFilter !== "all" || typeFilter !== "all"

  if (isLoadingDocs) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <PageHeader
        title="Revisión de Documentos"
        description="Revisa y aprueba documentos generados por los miembros del equipo"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatsCard title="Total" value={stats.total} description="Documentos" icon={Files} />
        <StatsCard title="Pendientes" value={stats.pending} description="Enviados por miembro" icon={Clock} />
        <StatsCard title="En revisión" value={stats.in_review} description="Revisando" icon={Eye} />
        <StatsCard title="Aprobados" value={stats.approved} description="Aprobados" icon={CheckCircle2} />
        <StatsCard title="Borradores" value={stats.draft} description="En edición" icon={AlertCircle} />
        <StatsCard title="Rechazados" value={stats.rejected} description="Rechazados" icon={XCircle} />
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Documentos para Revisión</CardTitle>
              <CardDescription>{filteredDocuments.length} documentos encontrados</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="mb-4">
            <TabsList>
              <TabsTrigger value="pending">
                Pendientes <Badge variant="secondary" className="ml-2">{stats.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="in_review">
                En revisión <Badge variant="secondary" className="ml-2">{stats.in_review}</Badge>
              </TabsTrigger>
              <TabsTrigger value="all">
                Todos <Badge variant="secondary" className="ml-2">{stats.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approved">Aprobados</TabsTrigger>
              <TabsTrigger value="draft">Borradores</TabsTrigger>
              <TabsTrigger value="rejected">Rechazados</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search and Filters */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código o objeto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentStatus)}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_review">En revisión</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[200px]">
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
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Documents Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Proceso</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No se encontraron documentos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => {
                    const status = statusConfig[doc.status] || statusConfig.pending
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="w-[420px] max-w-[420px] min-w-0" title={doc.name}>
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            {doc.fileUrl && doc.fileUrl.startsWith("http") ? (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium truncate min-w-0 flex-1 text-primary hover:underline block"
                                title={doc.name}
                              >
                                {doc.name}
                              </a>
                            ) : (
                              <span className="font-medium truncate min-w-0 flex-1" title={doc.name}>{doc.name}</span>
                            )}
                            <Badge variant="outline" className="text-xs shrink-0">
                              v{doc.version}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs min-w-0">
                            <p className="text-sm font-medium">{doc.processCode}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {doc.processObject}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{doc.entityName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getDocumentTypeName(doc.type)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className={cn("text-xs", status.className)}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            <p>{doc.createdAt}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onSelect={() => handleViewDocument(doc)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalles
                              </DropdownMenuItem>
                              {doc.fileUrl && (
                                <DropdownMenuItem
                                  onSelect={() => window.open(doc.fileUrl, "_blank")}
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Abrir Documento
                                </DropdownMenuItem>
                              )}
                              {doc.status === "pending" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => handleMoveToInReview(doc)}
                                    disabled={isUpdating}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Pasar a revisión
                                  </DropdownMenuItem>
                                </>
                              )}
                              {doc.status === "in_review" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setSelectedDocument(doc)
                                      setIsApproveDialogOpen(true)
                                    }}
                                    className="text-emerald-600"
                                    disabled={isUpdating}
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Aprobar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setSelectedDocument(doc)
                                      setIsRejectDialogOpen(true)
                                    }}
                                    className="text-destructive"
                                    disabled={isUpdating}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Rechazar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Document Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.name}</DialogTitle>
            <DialogDescription>Detalles del documento</DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Código del Proceso</Label>
                  <p className="font-medium">{selectedDocument.processCode}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Badge
                    variant={statusConfig[selectedDocument.status]?.variant || "outline"}
                    className={cn("mt-1", statusConfig[selectedDocument.status]?.className)}
                  >
                    {statusConfig[selectedDocument.status]?.label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entidad</Label>
                  <p className="font-medium">{selectedDocument.entityName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="font-medium">{getDocumentTypeName(selectedDocument.type)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Versión</Label>
                  <p className="font-medium">v{selectedDocument.version}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tamaño</Label>
                  <p className="font-medium">{formatFileSize(selectedDocument.fileSize)}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Objeto del Proceso</Label>
                <p className="mt-1 text-sm">{selectedDocument.processObject}</p>
              </div>
              <DocumentAuditLog documentId={selectedDocument.id} className="mt-2" />
              {selectedDocument.fileUrl && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(selectedDocument.fileUrl, "_blank")}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir Documento
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(selectedDocument.fileUrl, "_blank")}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </Button>
                </div>
              )}
              {selectedDocument.status === "pending" && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleMoveToInReview(selectedDocument)}
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    Pasar a revisión
                  </Button>
                </div>
              )}
              {selectedDocument.status === "in_review" && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      setIsDetailOpen(false)
                      setIsApproveDialogOpen(true)
                    }}
                    className="flex-1"
                    disabled={isUpdating}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Aprobar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsDetailOpen(false)
                      setIsRejectDialogOpen(true)
                    }}
                    className="flex-1"
                    disabled={isUpdating}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rechazar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Documento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas aprobar "{selectedDocument?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approval-comment">Comentario (opcional)</Label>
              <Textarea
                id="approval-comment"
                placeholder="Agrega un comentario sobre la aprobación..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aprobando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Aprobar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Documento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas rechazar "{selectedDocument?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-comment">Motivo del rechazo *</Label>
              <Textarea
                id="rejection-comment"
                placeholder="Explica el motivo del rechazo..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isUpdating || !approvalComment.trim()}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rechazando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

