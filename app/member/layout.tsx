"use client"

import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { useProfile } from "@/hooks/use-profile"
import { Loader2 } from "lucide-react"

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, isLoading } = useProfile()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar profile={profile} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
