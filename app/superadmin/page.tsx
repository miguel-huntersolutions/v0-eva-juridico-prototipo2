"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SuperadminDashboard } from "@/components/superadmin/dashboard"
import { useProfile } from "@/hooks/use-profile"
import { Loader2 } from "lucide-react"

export default function SuperadminPage() {
  const { profile, isLoading } = useProfile()

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
        <SuperadminDashboard />
      </main>
    </div>
  )
}
