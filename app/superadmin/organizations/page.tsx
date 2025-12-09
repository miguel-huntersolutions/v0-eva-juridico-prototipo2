"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"
import { AppSidebar } from "@/components/app-sidebar"
import { OrganizationsPage } from "@/components/superadmin/organizations-page"
import { useProfile } from "@/hooks/use-profile"
import { Loader2 } from "lucide-react"

export default function SuperadminOrganizationsPage() {
  const { profile, isLoading } = useProfile()

  useEffect(() => {
    logger.pageView("/superadmin/organizations", profile?.id, profile?.role)
  }, [profile?.id, profile?.role])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar profile={profile} />
      <main className="flex-1 overflow-auto">
        <OrganizationsPage />
      </main>
    </div>
  )
}
