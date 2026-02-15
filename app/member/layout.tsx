"use client"

import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import { Loader2 } from "lucide-react"

export default function MemberLayout({
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
    <SidebarProvider>
      <AppSidebar profile={profile} />
      <SidebarInset className={`overflow-y-auto px-6 py-6 md:px-8 md:py-8 ${isImpersonating ? "pt-[48px]" : ""}`}>{children}</SidebarInset>
    </SidebarProvider>
  )
}
