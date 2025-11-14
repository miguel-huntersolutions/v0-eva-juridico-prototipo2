"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { dataStore } from "@/lib/data-store"
import { Shield, Search, AlertCircle, User } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function AuditPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [entityFilter, setEntityFilter] = useState<string>("all")

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

  const allLogs = dataStore.getAuditLogs()

  // Apply filters
  const filteredLogs = allLogs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesEntity = entityFilter === "all" || log.entity === entityFilter

    return matchesSearch && matchesEntity
  })

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("creado") || action.includes("Creado")) return "default"
    if (action.includes("actualizado") || action.includes("Actualizado")) return "secondary"
    if (action.includes("eliminado") || action.includes("Eliminado")) return "destructive"
    return "outline"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Auditoría</h1>
            <p className="text-muted-foreground">Registro inmutable de todas las acciones en el sistema</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
            <CardDescription>Busca y filtra registros de auditoría</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuario, acción o ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de entidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las entidades</SelectItem>
                  <SelectItem value="process">Procesos</SelectItem>
                  <SelectItem value="user">Usuarios</SelectItem>
                  <SelectItem value="client">Clientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredLogs.length} {filteredLogs.length === 1 ? "Registro" : "Registros"}
            </CardTitle>
            <CardDescription>
              {searchQuery || entityFilter !== "all" ? "Resultados filtrados" : "Todos los registros de auditoría"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No se encontraron registros</h3>
                <p className="text-sm text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha y Hora</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>ID Entidad</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(log.timestamp, "d MMM yyyy, HH:mm:ss", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{log.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{log.entity}</TableCell>
                        <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddress}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Alert */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Los registros de auditoría son inmutables y se mantienen de forma permanente para garantizar la trazabilidad
            completa de todas las operaciones en el sistema.
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  )
}
