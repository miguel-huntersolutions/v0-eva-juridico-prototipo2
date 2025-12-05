"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { mockUsers } from "@/lib/mock-data"
import { DocumentsPage } from "@/components/member/documents-page"

export default function MemberDocumentsRoute() {
  const memberUser = mockUsers.find((u) => u.role === "member") || mockUsers[0]

  return (
    <div className="flex min-h-screen">
      <AppSidebar user={memberUser} />
      <main className="flex-1 overflow-auto">
        <DocumentsPage />
      </main>
    </div>
  )
}
