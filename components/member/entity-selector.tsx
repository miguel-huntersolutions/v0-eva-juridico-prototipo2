"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Building, ArrowRight, FolderKanban, FileText, Users, MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { getEntities, getCurrentProfile } from "@/lib/supabase/client-data-access"
import type { Entity } from "@/lib/supabase/client-data-access"

export function MemberEntitySelector() {
  const router = useRouter()
  const [hoveredEntity, setHoveredEntity] = React.useState<string | null>(null)
  const [entities, setEntities] = React.useState<Entity[]>([])
  const [organizationName, setOrganizationName] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const profile = await getCurrentProfile()
        if (profile?.organization_id) {
          const data = await getEntities(profile.organization_id)
          const activeEntities = data.filter((e) => e.status === "active")
          setEntities(activeEntities)
          // Obtener nombre de la organización del primer resultado si existe
          if (profile.full_name) {
            setOrganizationName(profile.full_name)
          }
        }
      } catch (err) {
        console.error("[v0] Error loading entities:", err)
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          {organizationName && (
            <div className="inline-flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <Users className="h-4 w-4" />
              <span>{organizationName}</span>
            </div>
          )}
          <h1 className="text-4xl font-bold tracking-tight">Selecciona una Entidad</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Elige la entidad con la que deseas trabajar. Podrás gestionar sus procesos y documentos.
          </p>
        </div>

        {/* Entity Grid */}
        {entities.length === 0 ? (
          <div className="text-center py-12">
            <Building className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No hay entidades disponibles</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Contacta a tu administrador para obtener acceso a entidades.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
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
                    <span className="font-medium">{entity.representative_name}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                      <FolderKanban className="h-3.5 w-3.5" />
                      {entity.processes_count || 0} procesos
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                      <FileText className="h-3.5 w-3.5" />
                      {entity.documents_count || 0} documentos
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

        {/* Help Text */}
        <p className="text-center text-sm text-muted-foreground">
          ¿No encuentras tu entidad? Contacta a tu administrador para obtener acceso.
        </p>
      </div>
    </div>
  )
}
