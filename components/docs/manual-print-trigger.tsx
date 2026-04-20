"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

export function ManualPrintTrigger() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("print") !== "1") return
    const timer = window.setTimeout(() => {
      window.print()
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchParams])

  return null
}

