"use client"

import { Suspense, useEffect } from "react"
import { logger } from "@/lib/logger"
import { DocumentsPage } from "@/components/member/documents-page"
import { useProfile } from "@/hooks/use-profile"
import { Loader2 } from "lucide-react"

function DocumentsPageWithSearchParams() {
  return <DocumentsPage />
}

export default function MemberDocumentsRoute() {
  const { profile } = useProfile()

  useEffect(() => {
    logger.pageView("/member/documents", profile?.id, profile?.role)
  }, [profile?.id, profile?.role])

  return (
    <Suspense fallback={<div className="flex min-h-[200px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <DocumentsPageWithSearchParams />
    </Suspense>
  )
}
