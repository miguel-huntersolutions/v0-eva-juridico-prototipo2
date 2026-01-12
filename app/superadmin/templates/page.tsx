"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"
import { AppSidebar } from "@/components/app-sidebar"
import { TemplatesPage } from "@/components/superadmin/templates-page"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import { Loader2 } from "lucide-react"

export default function SuperadminTemplatesPageRoute() {
  const { profile, isLoading } = useProfile()
  const { isImpersonating } = useImpersonation()

  useEffect(() => {
    logger.pageView("/superadmin/templates", profile?.id, profile?.role)
  }, [profile?.id, profile?.role])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar profile={profile} />
      <main className={`flex-1 overflow-y-auto ${isImpersonating ? "pt-[48px]" : ""}`}>
        <TemplatesPage />
      </main>
    </div>
  )
}
