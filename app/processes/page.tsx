"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProcessStatusBadge } from "@/components/process-status-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dataStore } from "@/lib/data-store"
import { mockClients } from "@/lib/mock-data"
import type { ProcessStatus, ProcessType } from "@/lib/types"
import { Plus, Search, Filter } from 'lucide-react'
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export default function ProcessesPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProcessStatus | "all">("all")
  const [typeFilter, setTypeFilter] = useState<ProcessType | "all">("all")

  if (!user) {
    return null
  }

  const clientId = user.clientId
  const allProcesses = dataStore.getProcesses(clientId || undefined)

  // Apply filters
  const filteredProcesses = allProcesses.filter((process) => {
    const matchesSearch =
      process.processNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      process.title.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || process.status === statusFilter
    const matchesType = typeFilter === "all" || process.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

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

  const canCreateProcess = ["super_admin", "legal_management"].includes(user.role)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Procesos</h1>
            <p className="text-muted-foreground">Gestión de procesos de contratación y consultas legales</p>
          </div>
          {canCreateProcess && (
            <Button asChild>
              <Link href="/processes/new">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Proceso
              </Link>
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
            <CardDescription>Busca y filtra procesos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número o título..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProcessStatus | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="pending_review">Pendiente Revisión</SelectItem>
                  <SelectItem value="in_review">En Revisión</SelectItem>
                  <SelectItem value="pending_client">Pendiente Cliente</SelectItem>
                  <SelectItem value="reviewed">Revisado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ProcessType | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="direct_contracting">Contratación Directa</SelectItem>
                  <SelectItem value="public_bidding">Licitación Pública</SelectItem>
                  <SelectItem value="minor_purchase">Compra Menor Cuantía</SelectItem>
                  <SelectItem value="legal_consultation">Consulta Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Processes Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredProcesses.length} {filteredProcesses.length === 1 ? "Proceso" : "Procesos"}
            </CardTitle>
            <CardDescription>
              {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "Resultados filtrados"
                : "Todos los procesos"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProcesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Filter className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No se encontraron procesos</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                    ? "Intenta ajustar los filtros de búsqueda"
                    : "Comienza creando tu primer proceso"}
                </p>
                {canCreateProcess && !searchQuery && statusFilter === "all" && typeFilter === "all" && (
                  <Button asChild>
                    <Link href="/processes/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Proceso
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Título</TableHead>
                      {user.role === "super_admin" && <TableHead>Cliente</TableHead>}
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Actualizado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProcesses.map((process) => (
                      <TableRow key={process.id}>
                        <TableCell className="font-mono text-sm">{process.processNumber}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="font-medium truncate">{process.title}</div>
                            <div className="text-sm text-muted-foreground truncate">{process.description}</div>
                          </div>
                        </TableCell>
                        {user.role === "super_admin" && <TableCell>{getClientName(process.clientId)}</TableCell>}
                        <TableCell className="capitalize whitespace-nowrap">{process.type.replace("_", " ")}</TableCell>
                        <TableCell>
                          <ProcessStatusBadge status={process.status} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {process.estimatedValue ? formatCurrency(process.estimatedValue) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
