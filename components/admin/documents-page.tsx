"use client"

import * as React from "react"
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
import { getEntities, getDocuments, type EntityMapped } from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"
import { useOrganizationSelector } from "@/hooks/use-organization-selector"
import { useRoleSwitcher } from "@/hooks/use-role-switcher"
import { cn } from "@/lib/utils"

type DocumentStatus = "all" | "draft" | "pending" | "approved" | "rejected"

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }
> = {
  draft: { label: "Borrador", variant: "secondary", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  pending: { label: "Pendiente", variant: "outline", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
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
  status: "draft" | "pending" | "approved" | "rejected"
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
        // First, get entities for the organization
        const orgEntities = await getEntities(effectiveOrganizationId)
        const entityIds = orgEntities.map((e) => e.id)
        
        // Get all documents
        const allDocs = await getDocuments()
        console.log("[AdminDocumentsPage] Raw documents from DB:", allDocs.length)
        console.log("[AdminDocumentsPage] Sample raw document:", allDocs[0])
        console.log("[AdminDocumentsPage] Organization entity IDs:", entityIds)
        
        // Filter documents to only include those from processes belonging to organization entities
        const filteredDocs = allDocs.filter((d: any) => {
          if (!d.process) {
            console.warn("[AdminDocumentsPage] Document without process:", d.id, d.name)
            return false
          }
          if (!d.process.entity) {
            console.warn("[AdminDocumentsPage] Document process without entity:", d.id, d.name, "process_id:", d.process_id)
            return false
          }
          const processEntityId = d.process.entity.id
          const isIncluded = processEntityId && entityIds.includes(processEntityId)
          if (!isIncluded && allDocs.length < 20) {
            console.log("[AdminDocumentsPage] Document filtered out:", d.name, "entity_id:", processEntityId, "not in", entityIds)
          }
          return isIncluded
        })
        
        console.log("[AdminDocumentsPage] Filtered documents count:", filteredDocs.length)
        
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
        console.log("[AdminDocumentsPage] Total documents in DB:", allDocs.length, "Organization documents:", mapped.length)
        console.log("[AdminDocumentsPage] Document statuses:", mapped.map(d => ({ name: d.name, status: d.status })))
        if (mapped.length > 0) {
          console.log("[AdminDocumentsPage] Sample mapped document:", mapped[0])
        }
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard title="Total" value={stats.total} description="Documentos" icon={Files} />
        <StatsCard title="Pendientes" value={stats.pending} description="Por revisar" icon={Clock} />
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{doc.name}</span>
                            <Badge variant="outline" className="text-xs">
                              v{doc.version}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
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
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                                    onSelect={() => {
                                      setSelectedDocument(doc)
                                      setIsApproveDialogOpen(true)
                                    }}
                                    className="text-emerald-600"
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
                    onClick={() => {
                      setIsDetailOpen(false)
                      setIsApproveDialogOpen(true)
                    }}
                    className="flex-1"
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

