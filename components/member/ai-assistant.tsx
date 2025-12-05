"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  Send,
  Bot,
  User,
  Loader2,
  X,
  Sparkles,
  Scale,
  FileText,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface AIAssistantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIAssistant({ open, onOpenChange }: AIAssistantProps) {
  const [input, setInput] = React.useState("")
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const { messages, sendMessage, status, error, setMessages, reload } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onError: (error) => {
      console.error("[v0] Chat error:", error)
    },
  })

  const isLoading = status === "submitted" || status === "streaming"

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const messageText = input.trim()
    setInput("")
    sendMessage({ text: messageText })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const getMessageText = (message: (typeof messages)[0]) => {
    return message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("")
  }

  const renderContent = (content: string) => {
    return content
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-semibold mt-3 mb-2 text-primary">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-medium mt-2 mb-1">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold'>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-sm">$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 list-decimal text-sm">$2</li>')
      .replace(
        /^> (.*$)/gim,
        '<blockquote class="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic text-sm">$1</blockquote>',
      )
      .replace(/📚|⚠️|✅|❌|💡/g, '<span class="mr-1">$&</span>')
      .replace(/\n\n/g, '</p><p class="my-2 text-sm">')
      .replace(/\n/g, "<br/>")
  }

  const suggestedQuestions = [
    { icon: Scale, text: "¿Cuándo aplica la contratación directa?" },
    { icon: FileText, text: "Requisitos de los estudios previos" },
    { icon: Sparkles, text: "Plazos de publicación en SECOP" },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-lg">Asistente Jurídico EVA</SheetTitle>
                <SheetDescription className="text-xs">Powered by OpenAI GPT-4o</SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="text-xs">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Limpiar
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error de conexión. Por favor intenta de nuevo.
                  <Button variant="link" size="sm" onClick={() => reload()} className="ml-2 p-0 h-auto">
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Welcome State */}
            {messages.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">¿En qué puedo ayudarte?</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  Soy tu asistente especializado en contratación pública colombiana. Pregúntame sobre normativa,
                  jurisprudencia o procedimientos.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {suggestedQuestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="justify-start text-left h-auto py-3 px-4 bg-transparent"
                      onClick={() => setInput(q.text)}
                    >
                      <q.icon className="h-4 w-4 mr-3 shrink-0 text-primary" />
                      <span className="text-sm">{q.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => {
              const text = getMessageText(message)
              return (
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
                      "group relative rounded-lg px-4 py-3 max-w-[85%]",
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {message.role === "assistant" ? (
                      <div
                        className="text-sm prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: renderContent(text) }}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{text}</p>
                    )}

                    {/* Copy button for assistant messages */}
                    {message.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-2 -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background border shadow-sm"
                        onClick={() => handleCopy(text, message.id)}
                      >
                        {copiedId === message.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Loading State */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-lg bg-muted px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span
                        className="h-2 w-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">Analizando tu consulta...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <Textarea
              ref={textareaRef}
              placeholder="Escribe tu consulta jurídica..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              className="min-h-[44px] max-h-32 resize-none"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            EVA puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
