"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"
import { DocsPage } from "@/components/docs/docs-page"

export default function DocumentationPage() {
  useEffect(() => {
    logger.pageView("/docs")
  }, [])

  return <DocsPage />
}
