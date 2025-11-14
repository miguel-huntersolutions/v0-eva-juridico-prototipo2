"use client"

import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProcessStatusBadge } from "@/components/process-status-badge"
import { dataStore } from "@/lib/data-store"
import { mockClients } from "@/lib/mock-data"
import { ArrowLeft, Building2, Mail, Phone, MapPin, AlertCircle } from 'lucide-react'
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params

  return <ClientDetailClient clientId={resolvedParams.id} />
}

function ClientDetailClient({ clientId }: { clientId: string }) {
  const { user } = useAuth()

  const client = mockClients.find((c) => c.id === clientId)
  const clientProcesses = client ? dataStore.getProcesses(client.id) : []
  const clientUsers = client ? dataStore.getUsers(client.id) : []
  const clientStats = client ? dataStore.getDashboardStats(client.id) : null

  if (!user || user.role !== "super_admin") {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No tienes permisos para acceder a esta sección.</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  if (!client) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Cliente no encontrado</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: "Super Administrador",
      legal_management: "Gestión Jurídica",
    }
    return labels[role] || role
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-muted-foreground">Información detallada del cliente</p>
          </div>
        </div>

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">NIT</p>
                  <p className="text-sm text-muted-foreground">{client.nit}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Dirección</p>
                  <p className="text-sm text-muted-foreground">{client.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Correo de Contacto</p>
                  <p className="text-sm text-muted-foreground">{client.contactEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Teléfono</p>
                  <p className="text-sm text-muted-foreground">{client.contactPhone}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-semibold mb-3">Base de Conocimiento</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Municipio: </span>
                  <span className="font-medium">{client.contextInfo.municipality}</span>
                </div>
                {client.contextInfo.contractionManual && (
                  <div>
                    <span className="text-muted-foreground">Manual de Contratación: </span>
                    <span className="font-medium">{client.contextInfo.contractionManual}</span>
                  </div>
                )}
                {client.contextInfo.internalRegulations && (
                  <div>
                    <span className="text-muted-foreground">Normativa Interna: </span>
                    <span className="font-medium">{client.contextInfo.internalRegulations}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {clientStats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{clientStats.totalProcesses}</div>
                <p className="text-xs text-muted-foreground">Procesos Totales</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{clientStats.pendingReview}</div>
                <p className="text-xs text-muted-foreground">Pendientes Revisión</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{clientStats.inReview}</div>
                <p className="text-xs text-muted-foreground">En Revisión</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{clientStats.completed}</div>
                <p className="text-xs text-muted-foreground">Completados</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios del Cliente</CardTitle>
            <CardDescription>{clientUsers.length} usuarios registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleLabel(user.role)}</TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "default" : "secondary"}>
                        {user.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Processes */}
        <Card>
          <CardHeader>
            <CardTitle>Procesos Recientes</CardTitle>
            <CardDescription>Últimos procesos del cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientProcesses.slice(0, 10).map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-mono text-sm">{process.processNumber}</TableCell>
                    <TableCell>{process.title}</TableCell>
                    <TableCell className="capitalize">{process.type.replace("_", " ")}</TableCell>
                    <TableCell>
                      <ProcessStatusBadge status={process.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(process.updatedAt, { addSuffix: true, locale: es })}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/processes/${process.id}`}>Ver</Link>
                      </Button>
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
