"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"
import { ProcessesPage } from "@/components/member/processes-page"
import { useProfile } from "@/hooks/use-profile"

export default function MemberProcessesRoute() {
  const { profile } = useProfile()

  useEffect(() => {
    logger.pageView("/member/processes", profile?.id, profile?.role)
  }, [profile?.id, profile?.role])

  return <ProcessesPage />
}
