"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProcessStatusBadge } from "@/components/process-status-badge"
import { DocumentGenerator } from "@/components/document-generator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { dataStore } from "@/lib/data-store"
import { mockClients, mockUsers } from "@/lib/mock-data"
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Clock,
  User,
  Building2,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Download,
  Edit,
  LinkIcon,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

export default async function ProcessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params

  return <ProcessDetailClient processId={resolvedParams.id} />
}

function ProcessDetailClient({ processId }: { processId: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const process = dataStore.getProcess(processId)
  const documents = dataStore.getDocuments(processId)
  const comments = dataStore.getComments(processId)
  const auditLogs = dataStore.getAuditLogs(processId)

  if (!user || !process) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Proceso no encontrado</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  const client = mockClients.find((c) => c.id === process.clientId)
  const creator = mockUsers.find((u) => u.id === process.createdBy)
  const assignedAdvisor = process.assignedTo ? mockUsers.find((u) => u.id === process.assignedTo) : null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const canEdit = process.status === "draft" && ["operator", "admin_client"].includes(user.role)
  const canReview = ["advisor_firm", "super_admin"].includes(user.role)
  const canSubmit = process.status === "draft" && ["operator", "admin_client"].includes(user.role)

  const handleTakeProcess = () => {
    if (process.status !== "pending_review") return

    dataStore.updateProcess(
      process.id,
      {
        status: "in_review",
        assignedTo: user.id,
        reviewStartedAt: new Date(),
      },
      user.id,
    )

    toast.success("Proceso asignado", {
      description: "Has tomado este proceso para revisión",
    })
    router.refresh()
  }

  const handleRequestInfo = () => {
    if (!comment.trim()) {
      toast.error("Escribe un mensaje")
      return
    }

    setIsSubmitting(true)

    dataStore.addComment({
      processId: process.id,
      userId: user.id,
      type: "info_request",
      content: comment,
    })

    dataStore.updateProcess(
      process.id,
      {
        status: "pending_client",
      },
      user.id,
    )

    setComment("")
    setIsSubmitting(false)
    toast.success("Solicitud enviada", {
      description: "El cliente ha sido notificado",
    })
  }

  const handleCompleteReview = () => {
    dataStore.updateProcess(
      process.id,
      {
        status: "reviewed",
        completedAt: new Date(),
      },
      user.id,
    )

    toast.success("Proceso completado", {
      description: "El proceso ha sido marcado como revisado",
    })
    router.push("/processes")
  }

  const handleSubmitForReview = () => {
    if (!process.scopCode) {
      toast.error("Confirma el código SCOP antes de enviar")
      return
    }

    dataStore.updateProcess(
      process.id,
      {
        status: "pending_review",
        submittedAt: new Date(),
      },
      user.id,
    )

    toast.success("Proceso enviado a revisión", {
      description: "Los asesores han sido notificados",
    })
    router.refresh()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href="/processes">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold tracking-tight">{process.processNumber}</h1>
                <ProcessStatusBadge status={process.status} />
              </div>
              <p className="text-xl text-muted-foreground">{process.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/processes/${process.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}
            {canSubmit && (
              <Button onClick={handleSubmitForReview}>
                <Send className="mr-2 h-4 w-4" />
                Enviar a Revisión
              </Button>
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{client?.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-semibold capitalize">{process.type.replace("_", " ")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-semibold">
                    {process.estimatedValue ? formatCurrency(process.estimatedValue) : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plazo</p>
                  <p className="font-semibold">{process.duration || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="documents">Documentos ({documents.length})</TabsTrigger>
            <TabsTrigger value="comments">Comunicaciones ({comments.length})</TabsTrigger>
            <TabsTrigger value="audit">Auditoría ({auditLogs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Proceso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-muted-foreground">Descripción del Objeto</Label>
                  <p className="mt-2 text-sm leading-relaxed">{process.description}</p>
                </div>

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Código SCOP</Label>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {process.scopCode || "No confirmado"}
                      </Badge>
                      {process.scopCodeConfirmedBy && (
                        <span className="text-xs text-muted-foreground">
                          Confirmado por {mockUsers.find((u) => u.id === process.scopCodeConfirmedBy)?.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Creado por</Label>
                    <p className="mt-2 text-sm">{creator?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(process.createdAt, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>

                  {assignedAdvisor && (
                    <div>
                      <Label className="text-muted-foreground">Asesor Asignado</Label>
                      <p className="mt-2 text-sm">{assignedAdvisor.name}</p>
                      <p className="text-xs text-muted-foreground">{assignedAdvisor.email}</p>
                    </div>
                  )}

                  {process.submittedAt && (
                    <div>
                      <Label className="text-muted-foreground">Enviado a Revisión</Label>
                      <p className="mt-2 text-sm">
                        {format(process.submittedAt, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                      </p>
                    </div>
                  )}

                  {process.reviewStartedAt && (
                    <div>
                      <Label className="text-muted-foreground">Revisión Iniciada</Label>
                      <p className="mt-2 text-sm">
                        {format(process.reviewStartedAt, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                      </p>
                    </div>
                  )}

                  {process.completedAt && (
                    <div>
                      <Label className="text-muted-foreground">Completado</Label>
                      <p className="mt-2 text-sm">
                        {format(process.completedAt, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Review Actions */}
            {canReview && process.status === "pending_review" && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>Acciones de Revisión</CardTitle>
                  <CardDescription>Toma este proceso para comenzar la revisión</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleTakeProcess} className="w-full">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Tomar Proceso
                  </Button>
                </CardContent>
              </Card>
            )}

            {canReview && process.status === "in_review" && process.assignedTo === user.id && (
              <>
                {client && (
                  <DocumentGenerator
                    process={process}
                    client={client}
                    advisorName={user.name}
                    onGenerate={(template, content) => {
                      dataStore.addAuditLog({
                        processId: process.id,
                        userId: user.id,
                        userName: user.name,
                        action: `Generó documento: ${template.name}`,
                        details: { templateId: template.id },
                      })
                    }}
                  />
                )}

                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle>Solicitar Información Adicional</CardTitle>
                    <CardDescription>
                      Envía una solicitud al cliente si necesitas aclaraciones o documentos adicionales
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="info-request">Mensaje</Label>
                      <Textarea
                        id="info-request"
                        placeholder="Describe la información que necesitas..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-24"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleRequestInfo}
                        disabled={isSubmitting}
                        variant="outline"
                        className="flex-1 bg-transparent"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Solicitar Información
                      </Button>
                      <Button onClick={handleCompleteReview} className="flex-1">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Completar Revisión
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentos Adjuntos</CardTitle>
                <CardDescription>Archivos y enlaces relacionados con este proceso</CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No hay documentos</h3>
                    <p className="text-sm text-muted-foreground">No se han adjuntado documentos a este proceso</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                          {doc.type === "link" ? (
                            <LinkIcon className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Subido por {mockUsers.find((u) => u.id === doc.uploadedBy)?.name} •{" "}
                              {format(doc.uploadedAt, "d 'de' MMMM, HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comunicaciones</CardTitle>
                <CardDescription>Historial de comentarios y solicitudes</CardDescription>
              </CardHeader>
              <CardContent>
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No hay comunicaciones</h3>
                    <p className="text-sm text-muted-foreground">No se han registrado comentarios en este proceso</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => {
                      const commentUser = mockUsers.find((u) => u.id === comment.userId)
                      return (
                        <div key={comment.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{commentUser?.name}</span>
                              <Badge variant={comment.type === "info_request" ? "default" : "secondary"}>
                                {comment.type === "info_request"
                                  ? "Solicitud"
                                  : comment.type === "info_response"
                                    ? "Respuesta"
                                    : "Comentario"}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(comment.createdAt, "d 'de' MMMM, HH:mm", { locale: es })}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{comment.content}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Auditoría</CardTitle>
                <CardDescription>Historial completo de cambios y acciones</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No hay registros</h3>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{log.userName}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {format(log.timestamp, "d 'de' MMMM, HH:mm", { locale: es })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{log.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
