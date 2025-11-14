"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, FileText, ToggleLeft, ToggleRight, Edit } from 'lucide-react'
import { mockProcessTypes } from "@/lib/mock-data"
import Link from "next/link"

export default function ProcessTypesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [processTypes, setProcessTypes] = useState(mockProcessTypes)

  const filteredTypes = processTypes.filter((type) =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleActiveStatus = (id: string) => {
    setProcessTypes(
      processTypes.map((type) => (type.id === id ? { ...type, active: !type.active } : type))
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tipos de Proceso</h1>
            <p className="text-muted-foreground">
              Gestiona los tipos de procesos y sus plantillas de documentos
            </p>
          </div>
          <Button asChild>
            <Link href="/process-types/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Tipo de Proceso
            </Link>
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tipos de proceso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tipos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processTypes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
              <ToggleRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {processTypes.filter((t) => t.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Plantillas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {processTypes.reduce((acc, type) => acc + type.documents.length, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Process Types List */}
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTypes.map((type) => (
            <Card key={type.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {type.name}
                      <Badge variant={type.active ? "default" : "secondary"}>
                        {type.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{type.description}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActiveStatus(type.id)}
                  >
                    {type.active ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Plantillas de documentos:</span>
                  <Badge variant="outline">{type.documents.length}</Badge>
                </div>

                {type.documents.length > 0 && (
                  <div className="space-y-2">
                    {type.documents.slice(0, 2).map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2 text-sm"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{doc.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {doc.structure.fields.length} campos
                        </Badge>
                      </div>
                    ))}
                    {type.documents.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{type.documents.length - 2} más
                      </p>
                    )}
                  </div>
                )}

                <Button asChild className="w-full" variant="outline">
                  <Link href={`/process-types/${type.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Gestionar Tipo y Plantillas
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTypes.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No se encontraron tipos de proceso</p>
              <p className="text-sm text-muted-foreground">
                Intenta con otros términos de búsqueda
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
