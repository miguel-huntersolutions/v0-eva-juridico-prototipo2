"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"
import { AppSidebar } from "@/components/app-sidebar"
import { SuperadminDashboard } from "@/components/superadmin/dashboard"
import { useProfile } from "@/hooks/use-profile"
import { Loader2 } from "lucide-react"

export default function SuperadminPage() {
  const { profile, isLoading } = useProfile(true)

  useEffect(() => {
    if (profile) {
      logger.pageView("/superadmin", profile.id, profile.role)
    }
  }, [profile])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null // Will redirect via useProfile hook
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar profile={profile} />
      <main className="flex-1 overflow-auto">
        <SuperadminDashboard />
      </main>
    </div>
  )
}
