"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building,
  FolderKanban,
  FileText,
  MessageSquareText,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  TrendingUp,
  Search,
  Users,
  ChevronRight,
  Scale,
  FileCheck,
  Zap,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { getEntities, getProcessesMapped, getMemberAssignedEntities, type Entity } from "@/lib/supabase/client-data-access"
import type { Process } from "@/lib/mock-data"
import { useProfile } from "@/hooks/use-profile"
import { logger } from "@/lib/logger"

const moduleOptions = [
  {
    title: "Procesos",
    description: "Gestiona todos los procesos de contratación de tus entidades asignadas",
    href: "/member/processes",
    icon: FolderKanban,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    features: ["Crear procesos", "Seguimiento", "Versionamiento"],
  },
  {
    title: "Documentos",
    description: "Accede a todos los documentos generados y gestiona sus versiones",
    href: "/member/documents",
    icon: FileText,
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    features: ["Exportar Word", "Historial", "Plantillas"],
  },
  {
    title: "Asistente Jurídico",
    description: "Consulta normatividad y recibe asistencia de IA especializada",
    href: "/member/assistant",
    icon: MessageSquareText,
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    features: ["Chat IA", "Jurisprudencia", "Ley 80"],
    badge: "IA",
  },
]

export default function MemberPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [hoveredEntity, setHoveredEntity] = React.useState<string | null>(null)
  const pageLoadTime = React.useRef(Date.now())

  const { profile, isLoading: profileLoading } = useProfile()
  const [assignedEntities, setAssignedEntities] = React.useState<Entity[]>([])
  const [loading, setLoading] = React.useState(true)
  const [allProcesses, setAllProcesses] = React.useState<Process[]>([])

  React.useEffect(() => {
    logger.pageView("/member", profile?.id, profile?.role)
  }, [profile?.id, profile?.role])

  React.useEffect(() => {
    async function loadEntities() {
      if (!profile?.organization_id || !profile?.id) {
        setLoading(false)
        return
      }
      const startTime = Date.now()
      try {
        // Get assigned entity IDs for this member
        const assignedEntityIds = await getMemberAssignedEntities(profile.id)
        console.log("[MemberPage] Assigned entity IDs:", assignedEntityIds)
        
        // Get all entities from organization
        const allEntities = await getEntities(profile.organization_id)
        
        // Filter to only assigned entities that are active
        const assigned = allEntities.filter(
          (e) => assignedEntityIds.includes(e.id) && e.status === "active"
        )
        
        console.log("[MemberPage] All entities:", allEntities.length, "Assigned entities:", assigned.length)
        setAssignedEntities(assigned)
        logger.fetch("/member", "Entities", true, Date.now() - startTime)
      } catch (err) {
        logger.error("/member", "Error loading entities", err)
      } finally {
        setLoading(false)
      }
    }
    if (!profileLoading && profile?.organization_id && profile?.id) {
      loadEntities()
    }
  }, [profile?.organization_id, profile?.id, profileLoading])

  React.useEffect(() => {
    async function loadProcesses() {
      const startTime = Date.now()
      try {
        const data = await getProcessesMapped()
        setAllProcesses(data)
        logger.fetch("/member", "Processes", true, Date.now() - startTime)
        logger.pageLoaded("/member", Date.now() - pageLoadTime.current, profile?.id, profile?.role)
      } catch (err) {
        logger.error("/member", "Error loading processes", err)
      }
    }
    loadProcesses()
  }, [profile?.id, profile?.role])

  const filteredEntities = assignedEntities.filter(
    (entity) => entity.name.toLowerCase().includes(searchQuery.toLowerCase()) || entity.nit.includes(searchQuery),
  )

  const totalProcesses = allProcesses.length
  const inProgressProcesses = allProcesses.filter((p) => p.status === "in_progress").length
  const completedProcesses = allProcesses.filter((p) => p.status === "completed").length
  const completionRate = totalProcesses > 0 ? Math.round((completedProcesses / totalProcesses) * 100) : 0

  const handleEntitySelect = (entityId: string) => {
    router.push(`/member/dashboard?entity=${entityId}`)
  }

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col gap-8 p-8">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Scale className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Panel del Asesor</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Bienvenido, <span className="font-medium text-foreground">{profile?.full_name || "Asesor"}</span>. Accede a
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
                  <p className="text-3xl font-bold">{assignedEntities.length}</p>
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
                  <p className="text-sm text-muted-foreground">En Progreso</p>
                  <p className="text-3xl font-bold">{inProgressProcesses}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                  <Clock className="h-6 w-6 text-amber-500" />
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
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Options */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Acceso Rápido</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {moduleOptions.map((option) => (
              <Link key={option.href} href={option.href}>
                <Card className="group relative overflow-hidden border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300 cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${option.iconBg}`}>
                        <option.icon className={`h-6 w-6 ${option.iconColor}`} />
                      </div>
                      {option.badge && (
                        <Badge className="bg-primary/20 text-primary border-0 text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {option.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
                      {option.title}
                    </CardTitle>
                    <CardDescription className="text-sm">{option.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {option.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs bg-muted/50 font-normal">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-4 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Acceder</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                  {/* Decorative gradient */}
                  <div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${option.iconBg}`}
                  />
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Entity Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Seleccionar Entidad</h2>
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              {filteredEntities.length} entidades
            </Badge>
          </div>

          {/* Search */}
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o NIT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border/50"
            />
          </div>

          {/* Entities Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEntities.map((entity) => {
              const entityProcesses = allProcesses.filter((p) => p.entityId === entity.id)
              const activeProcesses = entityProcesses.filter(
                (p) => p.status === "in_progress" || p.status === "review",
              ).length
              const entityCompletion =
                entityProcesses.length > 0
                  ? Math.round(
                      (entityProcesses.filter((p) => p.status === "completed").length / entityProcesses.length) * 100,
                    )
                  : 0

              return (
                <Card
                  key={entity.id}
                  className={`group relative overflow-hidden cursor-pointer transition-all duration-300 ${
                    hoveredEntity === entity.id
                      ? "border-primary bg-card shadow-lg shadow-primary/5"
                      : "border-border/50 bg-card/50 hover:bg-card hover:border-border"
                  }`}
                  onMouseEnter={() => setHoveredEntity(entity.id)}
                  onMouseLeave={() => setHoveredEntity(null)}
                  onClick={() => handleEntitySelect(entity.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* Entity Icon/Logo */}
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                        <Building className="h-7 w-7 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                              {entity.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">NIT: {entity.nit}</p>
                          </div>
                          <ChevronRight
                            className={`h-5 w-5 shrink-0 transition-all duration-300 ${
                              hoveredEntity === entity.id
                                ? "text-primary translate-x-0 opacity-100"
                                : "text-muted-foreground -translate-x-2 opacity-0"
                            }`}
                          />
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <div className="text-center p-2 rounded-lg bg-muted/30">
                            <p className="text-lg font-bold">{entityProcesses.length}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Procesos</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/30">
                            <p className="text-lg font-bold text-amber-500">{activeProcesses}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Activos</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/30">
                            <p className="text-lg font-bold text-emerald-500">{entityCompletion}%</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completo</p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3">
                          <Progress value={entityCompletion} className="h-1.5" />
                        </div>
                      </div>
                    </div>

                    {/* Representative */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground truncate">
                        Rep. Legal: <span className="text-foreground">{entity.representativeName}</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredEntities.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg mb-1">No se encontraron entidades</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  No hay entidades que coincidan con tu búsqueda. Intenta con otro término.
                </p>
                <Button variant="outline" className="mt-4 bg-transparent" onClick={() => setSearchQuery("")}>
                  Limpiar búsqueda
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Tips */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Consejo del día</h3>
                <p className="text-sm text-muted-foreground">
                  Utiliza el <span className="text-primary font-medium">Asistente Jurídico</span> para consultar
                  normatividad sobre contratación pública. Puedes preguntar sobre la Ley 80, el Decreto 1082 y
                  jurisprudencia del Consejo de Estado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
