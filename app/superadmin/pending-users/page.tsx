"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"
import { AppSidebar } from "@/components/app-sidebar"
import { PendingUsersPage } from "@/components/superadmin/pending-users-page"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import { Loader2 } from "lucide-react"

export default function SuperadminPendingUsersPage() {
  const { profile, isLoading } = useProfile()
  const { isImpersonating } = useImpersonation()

  useEffect(() => {
    logger.pageView("/superadmin/pending-users", profile?.id, profile?.role)
  }, [profile?.id, profile?.role])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar profile={profile} />
      <main className={`min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8 ${isImpersonating ? "pt-14" : ""}`}>
        <PendingUsersPage />
      </main>
    </div>
  )
}
