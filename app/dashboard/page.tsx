"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mail, User } from 'lucide-react'
import { DashboardLayout } from "@/components/dashboard-layout"
import { StatsCard } from "@/components/stats-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProcessStatusBadge } from "@/components/process-status-badge"
import { dataStore } from "@/lib/data-store"
import { mockClients } from "@/lib/mock-data"
import { FileText, Clock, CheckCircle2, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react'
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const clientId = user?.clientId
  const stats = dataStore.getDashboardStats(clientId || undefined)
  const processes = dataStore.getProcesses(clientId || undefined)
  const recentProcesses = processes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5)

  const getClientName = (clientId: string) => {
    const client = mockClients.find((c) => c.id === clientId)
    return client?.name || "Desconocido"
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const canCreateProcess = user && ["super_admin", "legal_management"].includes(user.role)

  if (!isLoading && !user) {
    router.push("/login")
    return null
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto">
        <DashboardLayout>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Bienvenido, {user?.name || user?.email?.split("@")[0]}
              </h1>
              <p className="text-muted-foreground">
                {user?.role === "super_admin"
                  ? "Vista general del sistema"
                  : user?.role === "legal_management"
                    ? "Gestiona procesos jurídicos de todos los clientes"
                    : "Gestiona los procesos de tu municipio"}
              </p>
            </div>

            {canCreateProcess && (
              <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Crear Nuevo Proceso</CardTitle>
                      <CardDescription>
                        Inicia un nuevo proceso de contratación o consulta legal con asistencia de IA
                      </CardDescription>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Button asChild size="lg" className="flex-1">
                      <Link href="/processes/new">
                        <FileText className="mr-2 h-5 w-5" />
                        Nuevo Proceso
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link href="/processes">Ver Todos</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Super Admin Dashboard */}
            {user?.role === "super_admin" && (
              <>
                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatsCard
                    title="Total Procesos"
                    value={stats.totalProcesses}
                    icon={FileText}
                    description="Todos los clientes"
                  />
                  <StatsCard
                    title="Pendientes Revisión"
                    value={stats.pendingReview}
                    icon={AlertCircle}
                    description="Requieren atención"
                  />
                  <StatsCard title="En Revisión" value={stats.inReview} icon={Clock} description="Siendo procesados" />
                  <StatsCard
                    title="Completados"
                    value={stats.completed}
                    icon={CheckCircle2}
                    description="Finalizados"
                  />
                </div>

                {/* Efficiency Metrics */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tiempo Promedio de Revisión</CardTitle>
                      <CardDescription>Desde inicio hasta completado</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stats.averageReviewTime}h</div>
                      <p className="text-sm text-muted-foreground mt-2">Reducción del 50% vs. proceso manual</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Índice de Eficiencia (ROI)</CardTitle>
                      <CardDescription>Ahorro estimado en costos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{formatCurrency(stats.efficiencyIndex)}</div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Basado en {stats.completed} procesos completados
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Processes */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Procesos Recientes</CardTitle>
                      <CardDescription>Últimas actualizaciones en el sistema</CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/processes">
                        Ver Todos
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proceso</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Actualizado</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentProcesses.map((process) => (
                          <TableRow key={process.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{process.processNumber}</div>
                                <div className="text-sm text-muted-foreground">{process.title}</div>
                              </div>
                            </TableCell>
                            <TableCell>{getClientName(process.clientId)}</TableCell>
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

                {/* Clients Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Clientes Activos</CardTitle>
                    <CardDescription>Municipios registrados en la plataforma</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockClients.map((client) => {
                        const clientProcesses = processes.filter((p) => p.clientId === client.id)
                        const clientStats = dataStore.getDashboardStats(client.id)

                        return (
                          <div key={client.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                              <h3 className="font-semibold">{client.name}</h3>
                              <p className="text-sm text-muted-foreground">{client.nit}</p>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <div className="text-center">
                                <div className="font-semibold">{clientProcesses.length}</div>
                                <div className="text-muted-foreground">Procesos</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold">{clientStats.pendingReview}</div>
                                <div className="text-muted-foreground">Pendientes</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold">{clientStats.completed}</div>
                                <div className="text-muted-foreground">Completados</div>
                              </div>
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/clients/${client.id}`}>Ver Detalles</Link>
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Legal Management Dashboard */}
            {user?.role === "legal_management" && (
              <>
                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatsCard
                    title="Total Procesos"
                    value={stats.totalProcesses}
                    icon={FileText}
                    description="Todos los clientes"
                  />
                  <StatsCard
                    title="Pendientes Revisión"
                    value={stats.pendingReview}
                    icon={AlertCircle}
                    description="Requieren atención"
                  />
                  <StatsCard title="En Revisión" value={stats.inReview} icon={Clock} description="Siendo procesados" />
                  <StatsCard
                    title="Completados"
                    value={stats.completed}
                    icon={CheckCircle2}
                    description="Finalizados"
                  />
                </div>

                {/* Recent Processes */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Procesos Recientes</CardTitle>
                      <CardDescription>Últimas actualizaciones en el sistema</CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/processes">
                        Ver Todos
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proceso</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Actualizado</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentProcesses.map((process) => (
                          <TableRow key={process.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{process.processNumber}</div>
                                <div className="text-sm text-muted-foreground">{process.title}</div>
                              </div>
                            </TableCell>
                            <TableCell>{getClientName(process.clientId)}</TableCell>
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

                {/* Clients Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Clientes Activos</CardTitle>
                    <CardDescription>Municipios con procesos activos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockClients.map((client) => {
                        const clientProcesses = processes.filter((p) => p.clientId === client.id)
                        const clientStats = dataStore.getDashboardStats(client.id)

                        return (
                          <div key={client.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                              <h3 className="font-semibold">{client.name}</h3>
                              <p className="text-sm text-muted-foreground">{client.nit}</p>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <div className="text-center">
                                <div className="font-semibold">{clientProcesses.length}</div>
                                <div className="text-muted-foreground">Procesos</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold">{clientStats.pendingReview}</div>
                                <div className="text-muted-foreground">Pendientes</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold">{clientStats.completed}</div>
                                <div className="text-muted-foreground">Completados</div>
                              </div>
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/processes?client=${client.id}`}>Ver Procesos</Link>
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </DashboardLayout>
      </main>
    </div>
  )
}
