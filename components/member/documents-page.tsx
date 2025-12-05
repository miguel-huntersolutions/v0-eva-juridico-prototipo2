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
import { documentTypes } from "@/lib/mock-data"
import { getEntities, getDocuments, type Entity } from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"

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
}

export function DocumentsPage() {
  const [selectedDocument, setSelectedDocument] = React.useState<MappedDocument | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<DocumentStatus>("all")
  const [entityFilter, setEntityFilter] = React.useState<string>("all")
  const [processFilter, setProcessFilter] = React.useState<string>("all")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [activeTab, setActiveTab] = React.useState("all")

  const [allDocuments, setAllDocuments] = React.useState<MappedDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = React.useState(true)
  const { profile } = useProfile()
  const [entities, setEntities] = React.useState<Entity[]>([])

  React.useEffect(() => {
    async function loadDocuments() {
      try {
        const docs = await getDocuments()
        const mapped: MappedDocument[] = docs.map((d) => ({
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
        }))
        setAllDocuments(mapped)
      } catch (err) {
        console.error("Error loading documents:", err)
      } finally {
        setIsLoadingDocs(false)
      }
    }
    loadDocuments()
  }, [])

  React.useEffect(() => {
    async function loadEntities() {
      if (!profile?.organization_id) return
      try {
        const data = await getEntities(profile.organization_id)
        setEntities(data)
      } catch (err) {
        console.error("Error loading entities:", err)
      }
    }
    if (profile?.organization_id) {
      loadEntities()
    }
  }, [profile?.organization_id])

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
        (activeTab === "draft" && doc.status === "draft")

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
    draft: allDocuments.filter((d) => d.status === "draft").length,
  }

  const handleViewDocument = (document: MappedDocument) => {
    setSelectedDocument(document)
    setIsDetailOpen(true)
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

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <PageHeader
        title="Gestión de Documentos"
        description="Visualiza y administra todos los documentos generados para tus procesos"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Documentos" value={stats.total} description="En todos los procesos" icon={Files} />
        <StatsCard title="Aprobados" value={stats.approved} description="Listos para uso" icon={CheckCircle2} />
        <StatsCard title="Pendientes" value={stats.pending} description="En espera de revisión" icon={Clock} />
        <StatsCard title="Borradores" value={stats.draft} description="En edición" icon={AlertCircle} />
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
                <TabsTrigger value="draft" className="gap-2">
                  Borradores
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {stats.draft}
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
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                  <FileText className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{document.name}</p>
                                  <p className="text-xs text-muted-foreground">{getDocumentTypeName(document.type)}</p>
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
                                  <DropdownMenuItem onClick={() => handleViewDocument(document)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver Detalles
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar Word
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <History className="mr-2 h-4 w-4" />
                                    Ver Historial
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Ir al Proceso
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
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
    </div>
  )
}
