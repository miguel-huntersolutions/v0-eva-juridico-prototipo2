"use client"

import * as React from "react"
import { Suspense } from "react"
import { usePathname } from "next/navigation"
import { Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AssistantSheet } from "@/components/assistant/assistant-sheet"

/**
 * RF-007 (CAP-01): el botón flotante abre el asistente real en un modal
 * (no el chat simulado). Si hay un proceso en pantalla, EVA lo toma como contexto.
 */
export function FloatingChat() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const isOnAssistantPage = pathname?.startsWith("/member/assistant") ?? false

  if (isOnAssistantPage) return null

  return (
    <div className={cn("fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3")}>
      <Button
        size="icon"
        className="relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        aria-label="Abrir asistente jurídico EVA"
        onClick={() => setOpen(true)}
      >
        <Bot className="h-6 w-6" />
      </Button>
      <Suspense fallback={null}>
        <AssistantSheet open={open} onOpenChange={setOpen} />
      </Suspense>
    </div>
  )
}
