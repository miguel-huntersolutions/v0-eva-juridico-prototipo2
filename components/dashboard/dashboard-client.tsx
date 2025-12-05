"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SuperadminDashboard } from "@/components/superadmin/dashboard"
import { AdminDashboard } from "@/components/admin/dashboard"
import { MemberEntitySelector } from "@/components/member/entity-selector"
import type { Profile } from "@/lib/types/database"

interface DashboardClientProps {
  profile: Profile
}

export function DashboardClient({ profile }: DashboardClientProps) {
  const renderContent = () => {
    switch (profile.role) {
      case "superadmin":
        return <SuperadminDashboard />
      case "admin":
        return <AdminDashboard />
      case "member":
        return <MemberEntitySelector />
      default:
        return <MemberEntitySelector />
    }
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar profile={profile} />
      <main className="flex-1 overflow-auto">{renderContent()}</main>
    </div>
  )
}
