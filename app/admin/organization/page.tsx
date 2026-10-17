"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"
import { OrganizationSettingsPage } from "@/components/admin/organization-settings-page"

export default function AdminOrganizationRoute() {
  useEffect(() => {
    logger.pageView("/admin/organization")
  }, [])

  return <OrganizationSettingsPage />
}
