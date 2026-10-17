"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Bot, ExternalLink, Loader2, Send, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useAssistantChat, useConversations, type ChatMessage } from "@/lib/ai-chat"
import { getProcessMapped } from "@/lib/supabase/client-data-access"

function processIdFromLocation(pathname: string | null, searchParams: URLSearchParams) {
  const fromQuery = searchParams.get("processId")
  if (fromQuery) return fromQuery
  const fromPath = pathname?.match(/\/processes\/([0-9a-f-]{36})/i)?.[1]
  return fromPath ?? null
}

export function AssistantSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const processId = processIdFromLocation(pathname, searchParams)
  const [processLabel, setProcessLabel] = React.useState<string | null>(null)
  const [processCode, setProcessCode] = React.useState<string | null>(null)
  const [input, setInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)
  const lastSavedAssistantIdRef = React.useRef<string | null>(null)
  const isSavingRef = React.useRef(false)

  const {
    createConversation: createConversationAPI,
    addMessages: addMessagesAPI,
    updateConversation: updateConversationAPI,
  } = useConversations({ autoLoad: false })

  const { messages, sendMessage, isLoading, error, setConversationId } = useAssistantChat({
    apiEndpoint: "/api/assistant",
    initialConversationId: activeConversationId || undefined,
    onResponseReceived: async (userMessage, assistantMessage) => {
      if (isSavingRef.current || lastSavedAssistantIdRef.current === assistantMessage.id) return
      isSavingRef.current = true
      lastSavedAssistantIdRef.current = assistantMessage.id
      try {
        const newMessages: ChatMessage[] = [userMessage, assistantMessage]
        if (!activeConversationId || activeConversationId.startsWith("temp-")) {
          const newConv = await createConversationAPI(userMessage.content || "Nueva conversación")
          setActiveConversationId(newConv.id)
          setConversationId(newConv.id)
          await updateConversationAPI(newConv.id, { openaiThreadId: newConv.id })
          await addMessagesAPI(newConv.id, newMessages)
        } else {
          await addMessagesAPI(activeConversationId, newMessages)
        }
      } catch (err) {
        console.error("[AssistantSheet] No se pudo guardar la conversación:", err)
      } finally {
        isSavingRef.current = false
      }
    },
  })

  React.useEffect(() => {
    if (!open || !processId) {
      setProcessLabel(null)
      setProcessCode(null)
      return
    }
    let cancelled = false
    getProcessMapped(processId)
      .then((p) => {
        if (cancelled || !p) return
        setProcessCode(p.code || null)
        setProcessLabel(p.entityName ? `${p.code} · ${p.entityName}` : p.code || null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, processId])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput("")
    const forApi = processCode ? `Respecto al proceso ${processCode}: ${text}` : text
    await sendMessage({ text: forApi })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle>Asistente jurídico EVA</SheetTitle>
                <SheetDescription>Consultas reales sobre contratación pública</SheetDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/member/assistant">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Página completa
              </Link>
            </Button>
          </div>
          {processLabel && (
            <Badge variant="outline" className="w-fit font-normal">
              Proceso en pantalla: {processLabel}
            </Badge>
          )}
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1" ref={scrollRef}>
          <div className="space-y-4 p-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Sparkles className="mb-3 h-8 w-8 text-primary" />
                <p className="text-sm font-medium">¿En qué te ayudo?</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Pregunta sobre normativa, plazos o el proceso que tienes abierto. Las respuestas quedan en tu
                  historial.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-2", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizando consulta…
              </div>
            )}

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error.message || "No se pudo obtener la respuesta"}
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSend()
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="Escribe tu consulta jurídica..."
              className="min-h-[48px] max-h-[140px] resize-none"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-10 w-10 shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
