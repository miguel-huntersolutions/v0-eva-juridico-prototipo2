"use client"

import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { mockUsers } from "@/lib/mock-data"

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const memberUser = mockUsers.find((u) => u.role === "member") || mockUsers[2]

  return (
    <SidebarProvider>
      <AppSidebar user={memberUser} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
