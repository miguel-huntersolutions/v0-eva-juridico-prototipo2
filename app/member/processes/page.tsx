"use client"
import { AppSidebar } from "@/components/app-sidebar"
import { mockUsers } from "@/lib/mock-data"
import { ProcessesPage } from "@/components/member/processes-page"

export default function MemberProcessesRoute() {
  const memberUser = mockUsers.find((u) => u.role === "member") || mockUsers[0]

  return (
    <div className="flex min-h-screen">
      <AppSidebar user={memberUser} />
      <main className="flex-1 overflow-auto">
        <ProcessesPage />
      </main>
    </div>
  )
}
