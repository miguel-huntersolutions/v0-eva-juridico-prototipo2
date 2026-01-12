"use client"

import type React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import { Loader2 } from "lucide-react"

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, loading } = useProfile()
  const { isImpersonating } = useImpersonation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar profile={profile} />
        <main className={`flex-1 overflow-y-auto ${isImpersonating ? "pt-[48px]" : ""}`}>{children}</main>
      </div>
    </SidebarProvider>
  )
}
