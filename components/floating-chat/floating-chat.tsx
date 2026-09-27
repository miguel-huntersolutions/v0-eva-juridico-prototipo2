"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * RF-007 (CAP-01): el acceso flotante del tablero abre el asistente real
 * (/member/assistant). No hay respuestas simuladas ni chat embebido aquí.
 */
export function FloatingChat() {
  const pathname = usePathname()
  const isOnAssistantPage = pathname?.startsWith("/member/assistant") ?? false

  if (isOnAssistantPage) return null

  return (
    <div className={cn("fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3")}>
      <Button
        asChild
        size="icon"
        className="relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        aria-label="Abrir asistente jurídico EVA"
      >
        <Link href="/member/assistant">
          <Bot className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  )
}
