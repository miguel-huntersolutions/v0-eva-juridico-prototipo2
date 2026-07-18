"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { OrganizationEntitiesPage } from "@/components/superadmin/organization-entities-page"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"

export default function OrganizationEntitiesRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id: organizationId } = React.use(params)
  const { profile, isLoading } = useProfile()
  const { isImpersonating } = useImpersonation()

  if (isLoading) return <div className="flex h-dvh items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
    <AppSidebar profile={profile} />
    <main className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-8 ${isImpersonating ? "md:pt-14" : ""}`}>
      <OrganizationEntitiesPage organizationId={organizationId} />
    </main>
  </div>
}
