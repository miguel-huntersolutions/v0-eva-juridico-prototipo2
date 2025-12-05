"use client"

import type React from "react"

import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { mockUsers } from "@/lib/mock-data"
import { useEffect, useState } from "react"
import type { User } from "@/lib/mock-data"

const getUserByRole = (role: string): User => {
  return mockUsers.find((u) => u.role === role) || mockUsers[0]
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User>(getUserByRole("member"))
  const [userRole, setUserRole] = useState("member")

  useEffect(() => {
    const savedRole = localStorage.getItem("eva_user_role")
    if (savedRole === "superadmin") {
      setUser(getUserByRole("superadmin"))
      setUserRole("superadmin")
    } else if (savedRole === "admin") {
      setUser(getUserByRole("admin"))
      setUserRole("admin")
    } else {
      setUser(getUserByRole("member"))
      setUserRole("member")
    }
  }, [])

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar user={user} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  )
}
