"use client"
import { AppSidebar } from "@/components/app-sidebar"
import { mockUsers } from "@/lib/mock-data"
import { TemplatesPage } from "@/components/superadmin/templates-page"

export default function SuperadminTemplatesPage() {
  const superadminUser = mockUsers.find((u) => u.role === "superadmin") || mockUsers[0]

  return (
    <div className="flex min-h-screen">
      <AppSidebar user={superadminUser} />
      <main className="flex-1 overflow-auto">
        <TemplatesPage />
      </main>
    </div>
  )
}
