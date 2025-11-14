"use client"

import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { dataStore } from "@/lib/data-store"
import { mockClients } from "@/lib/mock-data"
import { Building2, Users, FileText, TrendingUp, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function ClientsPage() {
  const { user } = useAuth()

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestión de municipios y alcaldías registradas</p>
        </div>

        <div className="grid gap-6">
          {mockClients.map((client) => {
            const clientProcesses = dataStore.getProcesses(client.id)
            const clientStats = dataStore.getDashboardStats(client.id)
            const clientUsers = dataStore.getUsers(client.id)

            return (
              <Card key={client.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{client.name}</CardTitle>
                        <CardDescription>
                          NIT: {client.nit} • {client.contactEmail}
                        </CardDescription>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={client.active ? "default" : "secondary"}>
                            {client.active ? "Activo" : "Inactivo"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Código: {client.invitationCode}</span>
                        </div>
                      </div>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/clients/${client.id}`}>Ver Detalles</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{clientProcesses.length}</p>
                        <p className="text-xs text-muted-foreground">Procesos Totales</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{clientStats.pendingReview}</p>
                        <p className="text-xs text-muted-foreground">Pendientes</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{clientStats.completed}</p>
                        <p className="text-xs text-muted-foreground">Completados</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{clientUsers.length}</p>
                        <p className="text-xs text-muted-foreground">Usuarios</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-muted/50 p-4">
                    <h4 className="text-sm font-semibold mb-2">Información de Contexto</h4>
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Municipio:</span>
                        <span className="font-medium">{client.contextInfo.municipality}</span>
                      </div>
                      {client.contextInfo.contractionManual && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Manual de Contratación:</span>
                          <span className="font-medium">Configurado</span>
                        </div>
                      )}
                      {client.contextInfo.internalRegulations && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Normativa Interna:</span>
                          <span className="font-medium">Configurada</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
