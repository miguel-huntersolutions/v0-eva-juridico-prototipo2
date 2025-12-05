"use client"

import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { useProfile } from "@/hooks/use-profile"
import { Loader2 } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useProfile()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <AppSidebar profile={profile} />
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  )
}
