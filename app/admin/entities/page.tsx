"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"
import { EntitiesPage } from "@/components/admin/entities-page"

export default function AdminEntitiesPage() {
  useEffect(() => {
    logger.pageView("/admin/entities")
  }, [])

  return <EntitiesPage />
}
