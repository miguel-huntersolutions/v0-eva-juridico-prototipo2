"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, Loader2, UserPlus, Users } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import { getEntities, getOrganizationMembers, getOrganizations, type EntityMapped, type OrganizationMapped, type Profile } from "@/lib/supabase/client-data-access"
import { logger } from "@/lib/logger"

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: organizationId } = React.use(params)
  const router = useRouter()
  const { profile, isLoading: profileLoading } = useProfile()
  const { isImpersonating } = useImpersonation()
  const [organization, setOrganization] = React.useState<OrganizationMapped | null>(null)
  const [members, setMembers] = React.useState<Profile[]>([])
  const [entities, setEntities] = React.useState<EntityMapped[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const loadOverview = async () => {
      try {
        setLoading(true)
        const [orgs, memberList, entityList] = await Promise.all([
          getOrganizations(),
          getOrganizationMembers(organizationId),
          getEntities(organizationId),
        ])
        setOrganization(orgs.find((org) => org.id === organizationId) || null)
        setMembers(memberList)
        setEntities(entityList)
        logger.pageView("/superadmin/organizations/[id]", undefined, undefined, { organizationId })
      } catch (err) {
        logger.error("/superadmin/organizations/[id]", "Error loading organization overview", err)
      } finally {
        setLoading(false)
      }
    }
    loadOverview()
  }, [organizationId])

  if (profileLoading || loading) {
    return <div className="flex h-dvh items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar profile={profile} />
      <main className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-8 ${isImpersonating ? "md:pt-14" : ""}`}>
        {!organization ? (
          <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">Organización no encontrada</p>
            <Button variant="outline" onClick={() => router.push("/superadmin/organizations")}>Volver</Button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:gap-6">
            <Button variant="ghost" size="sm" className="w-fit gap-1.5" onClick={() => router.push("/superadmin/organizations")}>
              <ArrowLeft className="h-4 w-4" />
              Volver a organizaciones
            </Button>
            <PageHeader title={organization.name} description={`NIT: ${organization.nit}`} />
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard title="Miembros" value={members.length} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
              <StatCard title="Entidades" value={entities.length} icon={<Building2 className="h-4 w-4 text-muted-foreground" />} />
              <StatCard title="Administradores" value={members.filter((member) => member.role === "admin").length} icon={<UserPlus className="h-4 w-4 text-muted-foreground" />} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <NavigationCard title="Miembros" description="Gestiona administradores y asesores jurídicos." icon={<Users className="h-6 w-6 text-primary" />} action="Ver miembros" onClick={() => router.push(`/superadmin/organizations/${organizationId}/members`)} />
              <NavigationCard title="Entidades" description="Gestiona entidades y sus secretarías." icon={<Building2 className="h-6 w-6 text-primary" />} action="Ver entidades" onClick={() => router.push(`/superadmin/organizations/${organizationId}/entities`)} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle>{icon}</CardHeader><CardContent><div className="text-2xl font-bold">{value}</div></CardContent></Card>
}

function NavigationCard({ title, description, icon, action, onClick }: { title: string; description: string; icon: React.ReactNode; action: string; onClick: () => void }) {
  return <Card className="transition-colors hover:bg-muted/40"><CardHeader><div className="flex items-center gap-3">{icon}<div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div></div></CardHeader><CardContent><Button className="w-full" onClick={onClick}>{action}</Button></CardContent></Card>
}
