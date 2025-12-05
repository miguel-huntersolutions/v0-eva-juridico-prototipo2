"use client"

import * as React from "react"
import { Building2, Search, Loader2, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getOrganizations, type Organization } from "@/lib/supabase/client-data-access"

interface OrganizationSelectorProps {
  onSelect: (organization: Organization) => void
  title?: string
  description?: string
}

export function OrganizationSelector({
  onSelect,
  title = "Seleccionar Organización",
  description = "Seleccione la organización con la que desea trabajar",
}: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [filteredOrganizations, setFilteredOrganizations] = React.useState<Organization[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadOrganizations() {
      try {
        setIsLoading(true)
        const orgs = await getOrganizations()
        setOrganizations(orgs)
        setFilteredOrganizations(orgs)
      } catch (err) {
        console.error("Error loading organizations:", err)
        setError("Error al cargar las organizaciones")
      } finally {
        setIsLoading(false)
      }
    }
    loadOrganizations()
  }, [])

  React.useEffect(() => {
    if (searchTerm) {
      const filtered = organizations.filter(
        (org) =>
          org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          org.nit?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredOrganizations(filtered)
    } else {
      setFilteredOrganizations(organizations)
    }
  }, [searchTerm, organizations])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando organizaciones...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o NIT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {filteredOrganizations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchTerm ? "No se encontraron organizaciones" : "No hay organizaciones disponibles"}
              </div>
            ) : (
              filteredOrganizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => onSelect(org)}
                  className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      {org.nit && <p className="text-sm text-muted-foreground">NIT: {org.nit}</p>}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
