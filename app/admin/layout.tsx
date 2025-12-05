import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { mockUsers } from "@/lib/mock-data"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminUser = mockUsers.find((u) => u.role === "admin")!

  return (
    <div className="flex h-screen">
      <AppSidebar user={adminUser} />
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  )
}
