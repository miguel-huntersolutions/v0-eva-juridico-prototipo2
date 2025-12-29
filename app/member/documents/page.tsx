"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"
import { DocumentsPage } from "@/components/member/documents-page"
import { useProfile } from "@/hooks/use-profile"

export default function MemberDocumentsRoute() {
  const { profile } = useProfile()

  useEffect(() => {
    logger.pageView("/member/documents", profile?.id, profile?.role)
  }, [profile?.id, profile?.role])

  return <DocumentsPage />
}
