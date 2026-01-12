"use client"

import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { useProfile } from "@/hooks/use-profile"
import { useRoleSwitcher } from "@/hooks/use-role-switcher"
import { useOrganizationSelector } from "@/hooks/use-organization-selector"
import { useImpersonation } from "@/lib/impersonation-context"
import { OrganizationSelector } from "@/components/admin/organization-selector"
import { Loader2 } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading: profileLoading } = useProfile()
  const { actualRole, isSimulating, isLoaded: roleLoaded } = useRoleSwitcher(profile?.role)
  const {
    effectiveOrganizationId,
    needsOrganizationSelection,
    isLoaded: orgLoaded,
    selectOrganization,
  } = useOrganizationSelector({
    userOrganizationId: profile?.organization_id,
    isSuperadmin: actualRole === "superadmin",
    isSimulatingAdmin: isSimulating && actualRole === "superadmin",
  })
  const { isImpersonating } = useImpersonation()

  const isLoading = profileLoading || !roleLoaded || !orgLoaded

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (needsOrganizationSelection) {
    return (
      <OrganizationSelector
        onSelect={(org) => {
          selectOrganization(org)
          // Force reload to apply the selection
          window.location.reload()
        }}
        title="Seleccionar Organización"
        description="Como administrador, seleccione la organización con la que desea trabajar"
      />
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar profile={profile} selectedOrganizationId={effectiveOrganizationId || undefined} />
      <main className={`flex-1 overflow-y-auto bg-background ${isImpersonating ? "pt-[48px]" : ""}`}>{children}</main>
    </div>
  )
}
