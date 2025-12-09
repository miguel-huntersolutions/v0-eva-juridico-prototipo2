"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"
import { MembersPage } from "@/components/admin/members-page"

export default function AdminMembersRoute() {
  useEffect(() => {
    logger.pageView("/admin/members")
  }, [])

  return <MembersPage />
}
