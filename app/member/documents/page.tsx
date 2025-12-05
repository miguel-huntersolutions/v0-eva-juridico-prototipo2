"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { DocumentsPage } from "@/components/member/documents-page"
import { useProfile } from "@/hooks/use-profile"
import { Loader2 } from "lucide-react"

export default function MemberDocumentsRoute() {
  const { profile, loading } = useProfile()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar profile={profile} />
      <main className="flex-1 overflow-auto">
        <DocumentsPage />
      </main>
    </div>
  )
}
