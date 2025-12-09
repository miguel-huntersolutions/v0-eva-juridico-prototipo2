"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"
import { AdminDashboard } from "@/components/admin/dashboard"

export default function AdminPage() {
  useEffect(() => {
    logger.pageView("/admin")
  }, [])

  return <AdminDashboard />
}
