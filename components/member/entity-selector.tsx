"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Building, ArrowRight, FolderKanban, FileText, Users, MapPin, Clock, CheckCircle2, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { getEntities, getCurrentProfile, getProcessesMapped, getDocuments } from "@/lib/supabase/client-data-access"
import type { Entity } from "@/lib/supabase/client-data-access"

export function MemberEntitySelector() {
  const router = useRouter()
  const [hoveredEntity, setHoveredEntity] = React.useState<string | null>(null)
  const [entities, setEntities] = React.useState<Entity[]>([])
  const [organizationName, setOrganizationName] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [allProcesses, setAllProcesses] = React.useState<any[]>([])
  const [allDocuments, setAllDocuments] = React.useState<any[]>([])

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const profile = await getCurrentProfile()
        console.log("[MemberEntitySelector] Profile loaded:", { 
          id: profile?.id, 
          organization_id: profile?.organization_id,
          role: profile?.role 
        })
        
        if (!profile?.organization_id) {
          console.warn("[MemberEntitySelector] No organization_id found in profile")
          setEntities([])
          setIsLoading(false)
          return
        }
        
        console.log("[MemberEntitySelector] Loading entities for organization:", profile.organization_id)
        const data = await getEntities(profile.organization_id)
        console.log("[MemberEntitySelector] Entities loaded:", data.length, "total entities")
        
        const activeEntities = data.filter((e) => e.status === "active")
        console.log("[MemberEntitySelector] Active entities:", activeEntities.length)
        setEntities(activeEntities)
        
        // Obtener nombre de la organización del primer resultado si existe
        if (profile.full_name) {
          setOrganizationName(profile.full_name)
        }

          // Cargar procesos y documentos para estadísticas
          // Filtrar por entidades de la organización
          try {
            const allProcessesData = await getProcessesMapped()
            // Filtrar procesos por las entidades de la organización
            const entityIds = activeEntities.map((e) => e.id)
            const organizationProcesses = (allProcessesData || []).filter((p) => entityIds.includes(p.entityId))
            setAllProcesses(organizationProcesses)
            
            // Filtrar documentos por los procesos de la organización
            const allDocumentsData = await getDocuments()
            const processIds = organizationProcesses.map((p) => p.id)
            const organizationDocuments = (allDocumentsData || []).filter((d: any) => {
              // getDocuments returns documents with process_id field (snake_case)
              return processIds.includes(d.process_id)
            })
            setAllDocuments(organizationDocuments)
          } catch (err) {
            console.error("[v0] Error loading processes or documents:", err)
          }
      } catch (err) {
        console.error("[v0] Error loading entities:", err)
        setEntities([])
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleEntitySelect = (entityId: string) => {
    router.push(`/member/dashboard?entity=${entityId}`)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando entidades...</p>
        </div>
      </div>
    )
  }

  const totalProcesses = allProcesses.length
  const inProgressProcesses = allProcesses.filter((p) => p.status === "in_progress").length
  const completedProcesses = allProcesses.filter((p) => p.status === "completed").length
  const completionRate = totalProcesses > 0 ? Math.round((completedProcesses / totalProcesses) * 100) : 0
  const totalDocuments = allDocuments.length

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col gap-8 p-8">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Panel del Asesor</h1>
          <p className="text-muted-foreground max-w-2xl">
            Bienvenido, <span className="font-medium text-foreground">{organizationName || "Asesor"}</span>. Accede a
            tus herramientas de gestión jurídica y selecciona una entidad para comenzar.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Entidades Asignadas</p>
                  <p className="text-3xl font-bold">{entities.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Building className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Procesos Totales</p>
                  <p className="text-3xl font-bold">{totalProcesses}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                  <FolderKanban className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Documentos</p>
                  <p className="text-3xl font-bold">{totalDocuments}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  <FileText className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tasa Completado</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{completionRate}%</p>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                  <CheckCircle2 className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entity Selection Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Seleccionar Entidad</h2>
            <Badge variant="outline" className="text-muted-foreground">
              {entities.length} entidades
            </Badge>
          </div>

          {/* Entity Grid */}
          {entities.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                  <Building className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg mb-1">No hay entidades disponibles</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Contacta a tu administrador para obtener acceso a entidades.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entities.map((entity) => (
              <Card
                key={entity.id}
                className={`group cursor-pointer transition-all duration-300 border-2 ${
                  hoveredEntity === entity.id
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-transparent hover:border-primary/30"
                }`}
                onClick={() => handleEntitySelect(entity.id)}
                onMouseEnter={() => setHoveredEntity(entity.id)}
                onMouseLeave={() => setHoveredEntity(null)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
                          hoveredEntity === entity.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        <Building className="h-7 w-7" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{entity.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          NIT: {entity.nit}
                        </CardDescription>
                      </div>
                    </div>
                    <StatusBadge status={entity.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Representative */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Rep. Legal:</span>
                    <span className="font-medium">{entity.representativeName || "N/A"}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                      <FolderKanban className="h-3.5 w-3.5" />
                      {allProcesses.filter((p) => p.entityId === entity.id).length} procesos
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                      <FileText className="h-3.5 w-3.5" />
                      {allDocuments.filter((d: any) => {
                        // Document can have process_id directly or through process relation
                        const processId = d.process_id || (d.process?.id)
                        const process = allProcesses.find((p) => p.id === processId)
                        // Also check if document has process.entity relation
                        const entityIdFromProcess = process?.entityId || (d.process?.entity?.id || d.process?.entity_id)
                        return entityIdFromProcess === entity.id
                      }).length} documentos
                    </Badge>
                  </div>

                  {/* Action */}
                  <div className="flex items-center justify-end pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`transition-all ${
                        hoveredEntity === entity.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                      }`}
                    >
                      Acceder
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
