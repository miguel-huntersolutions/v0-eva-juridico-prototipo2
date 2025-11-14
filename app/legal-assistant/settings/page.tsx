"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, FileText, Trash2, Eye, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { mockKnowledgeDocuments } from "@/lib/mock-data"
import type { KnowledgeDocument } from "@/lib/types"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function LegalAssistantSettingsPage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(mockKnowledgeDocuments)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const [newDoc, setNewDoc] = useState({
    name: "",
    description: "",
    category: "normativa",
    file: null as File | null,
  })

  const handleUpload = async () => {
    if (!newDoc.name || !newDoc.description || !newDoc.file) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    // Simular carga y análisis
    setTimeout(() => {
      const doc: KnowledgeDocument = {
        id: `kd-${documents.length + 1}`,
        name: newDoc.name,
        description: newDoc.description,
        fileUrl: `/docs/${newDoc.file?.name}`,
        fileType: newDoc.file?.name.split(".").pop() || "pdf",
        fileSize: newDoc.file?.size || 0,
        category: newDoc.category,
        uploadedBy: "user-1",
        uploadedAt: new Date(),
        lastIndexed: new Date(),
        active: true,
        metadata: {
          totalPages: Math.floor(Math.random() * 100) + 10,
          keywords: ["contratación", "normativa"],
          summary: "Documento analizado por IA",
        },
      }

      setDocuments([...documents, doc])
      setIsUploadOpen(false)
      setNewDoc({ name: "", description: "", category: "normativa", file: null })
      setIsUploading(false)

      toast({
        title: "Documento cargado",
        description: "El documento ha sido analizado y está disponible para consultas",
      })
    }, 3000)
  }

  const handleDelete = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id))
    toast({
      title: "Documento eliminado",
      description: "El documento ha sido removido de la base de conocimiento",
    })
  }

  const handleReindex = (id: string) => {
    toast({
      title: "Reindexando documento",
      description: "El documento está siendo analizado nuevamente",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB"
    return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      normativa: "Normativa",
      jurisprudencia: "Jurisprudencia",
      doctrina: "Doctrina",
      procedimientos: "Procedimientos",
    }
    return labels[category] || category
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/legal-assistant">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Chat
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Configuración del Asistente</h1>
              <p className="text-muted-foreground">Gestiona los documentos de la base de conocimiento</p>
            </div>
          </div>

          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Cargar Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Cargar Nuevo Documento</DialogTitle>
                <DialogDescription>
                  El documento será analizado automáticamente por IA para identificar contenido relevante
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Documento</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Ley 80 de 1993"
                    value={newDoc.name}
                    onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Breve descripción del contenido del documento"
                    value={newDoc.description}
                    onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={newDoc.category} onValueChange={(value) => setNewDoc({ ...newDoc, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normativa">Normativa</SelectItem>
                      <SelectItem value="jurisprudencia">Jurisprudencia</SelectItem>
                      <SelectItem value="doctrina">Doctrina</SelectItem>
                      <SelectItem value="procedimientos">Procedimientos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">Archivo</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setNewDoc({ ...newDoc, file: e.target.files?.[0] || null })}
                  />
                  <p className="text-xs text-muted-foreground">Formatos soportados: PDF, DOCX, TXT</p>
                </div>

                {isUploading && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      <div>
                        <p className="text-sm font-medium">Analizando documento con IA...</p>
                        <p className="text-xs text-muted-foreground">
                          Extrayendo contenido, identificando temas clave y estructurando información
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? "Procesando..." : "Cargar y Analizar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Documentos Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.filter((d) => d.active).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Hoy</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tamaño Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatFileSize(documents.reduce((acc, d) => acc + d.fileSize, 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Documentos */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos en la Base de Conocimiento</CardTitle>
            <CardDescription>
              Gestiona los documentos que el asistente consultará para responder preguntas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Última Indexación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(doc.category)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatFileSize(doc.fileSize)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.lastIndexed.toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell>
                      {doc.active ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleReindex(doc.id)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
