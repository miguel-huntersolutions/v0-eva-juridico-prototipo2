"use client"

import * as React from "react"
import { Send, Bot, User, Loader2, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { mockChatConversations, type ChatMessage } from "@/lib/mock-data"

interface AIAssistantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIAssistant({ open, onOpenChange }: AIAssistantProps) {
  // Initialize with empty messages or messages from first conversation
  const initialMessages: ChatMessage[] = mockChatConversations[0]?.messages || []
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `Gracias por tu consulta sobre "${input.slice(0, 50)}...". 

Basándome en la normativa de contratación pública colombiana, específicamente el Decreto 1082 de 2015 y las directrices de Colombia Compra Eficiente, puedo indicarte que...

**Puntos clave:**
1. Es importante verificar el tipo de proceso aplicable según la cuantía y el objeto.
2. Se debe documentar adecuadamente la justificación de la necesidad.
3. Los plazos establecidos en la ley deben cumplirse estrictamente.

¿Necesitas información adicional sobre algún aspecto específico?`,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, aiMessage])
    setIsLoading(false)
  }

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const suggestedQuestions = [
    "¿Cuándo aplica la contratación directa?",
    "Requisitos para licitación pública",
    "Plazos de publicación en SECOP",
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle>Asistente Jurídico</SheetTitle>
                <SheetDescription>Consultas sobre contratación pública</SheetDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">¿En qué puedo ayudarte?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Pregúntame sobre jurisprudencia, normativa de contratación pública o conceptos de Colombia Compra.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-transparent"
                      onClick={() => setInput(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    "rounded-lg px-4 py-3 max-w-[85%]",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={cn(
                      "text-xs mt-2",
                      message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {new Date(message.timestamp).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-lg bg-muted px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Escribe tu consulta jurídica..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
