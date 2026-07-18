"use client"

import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import { Loader2 } from "lucide-react"

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, isLoading } = useProfile()
  const { isImpersonating } = useImpersonation()

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
      <main className={`min-h-0 flex-1 overflow-y-auto bg-background ${isImpersonating ? "pt-[48px]" : ""}`}>
        {children}
      </main>
    </div>
  )
}

