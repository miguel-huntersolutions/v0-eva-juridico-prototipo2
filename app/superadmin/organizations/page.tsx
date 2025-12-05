"use client"
import { AppSidebar } from "@/components/app-sidebar"
import { mockUsers } from "@/lib/mock-data"
import { OrganizationsPage } from "@/components/superadmin/organizations-page"

export default function SuperadminOrganizationsPage() {
  const superadminUser = mockUsers.find((u) => u.role === "superadmin") || mockUsers[0]

  return (
    <div className="flex min-h-screen">
      <AppSidebar user={superadminUser} />
      <main className="flex-1 overflow-auto">
        <OrganizationsPage />
      </main>
    </div>
  )
}
