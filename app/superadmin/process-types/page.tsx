"use client"
import { AppSidebar } from "@/components/app-sidebar"
import { mockUsers } from "@/lib/mock-data"
import { ProcessTypesPage } from "@/components/superadmin/process-types-page"

export default function SuperadminProcessTypesPage() {
  const superadminUser = mockUsers.find((u) => u.role === "superadmin") || mockUsers[0]

  return (
    <div className="flex min-h-screen">
      <AppSidebar user={superadminUser} />
      <main className="flex-1 overflow-auto">
        <ProcessTypesPage />
      </main>
    </div>
  )
}
