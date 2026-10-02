"use client"

import type React from "react"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import { Loader2 } from "lucide-react"
import { FloatingChat } from "@/components/floating-chat/floating-chat"

const ENTITY_CONTACT_ALLOWED = ["/member/messages"]

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, isLoading } = useProfile()
  const { isImpersonating } = useImpersonation()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !profile || profile.role !== "entity_contact") return
    const allowed = ENTITY_CONTACT_ALLOWED.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
    if (!allowed) router.replace("/member/messages")
  }, [isLoading, profile, pathname, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const showAssistant = profile?.role !== "entity_contact"

  return (
    <SidebarProvider>
      <AppSidebar profile={profile} />
      <SidebarInset className={`px-4 py-4 md:px-8 md:py-8 ${isImpersonating ? "md:pt-[48px]" : ""}`}>{children}</SidebarInset>
      {showAssistant ? <FloatingChat /> : null}
    </SidebarProvider>
  )
}
