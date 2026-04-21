"use client"

import * as React from "react"
import { Bot, X, Send, Minimize2, Maximize2, Loader2, AlertCircle, MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useAssistantChat } from "@/lib/ai-chat/use-assistant-chat"
import { useConversations } from "@/lib/ai-chat"
import type { ChatMessage } from "@/lib/ai-chat/types"

function renderMessageContent(content: string) {
  const lines = content.split("\n")
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
    return (
      <React.Fragment key={i}>
        {parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j}>{part.slice(2, -2)}</strong>
          }
          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <code key={j} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                {part.slice(1, -1)}
              </code>
            )
          }
          return <span key={j}>{part}</span>
        })}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    )
  })
}

export function FloatingChat() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isMinimized, setIsMinimized] = React.useState(false)
  const [inputText, setInputText] = React.useState("")
  const messagesScrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)
  const lastSavedAssistantIdRef = React.useRef<string | null>(null)
  const isSavingRef = React.useRef(false)

  const {
    createConversation: createConversationAPI,
    addMessages: addMessagesAPI,
    updateConversation: updateConversationAPI,
  } = useConversations({
    autoLoad: true,
    onConversationCreated: (conv) => {
      setActiveConversationId(conv.id)
    },
  })

  const {
    messages,
    sendMessage,
    isLoading,
    error,
    setMessages,
    setThreadId,
    conversationId: hookConversationId,
    setConversationId: setHookConversationId,
  } = useAssistantChat({
    apiEndpoint: "/api/assistant",
    initialConversationId: activeConversationId || undefined,
    onResponseReceived: async (userMessage, assistantMessage) => {
      if (isSavingRef.current || lastSavedAssistantIdRef.current === assistantMessage.id) {
        return
      }

      isSavingRef.current = true
      lastSavedAssistantIdRef.current = assistantMessage.id

      try {
        const newMessages: ChatMessage[] = [userMessage, assistantMessage]

        if (activeConversationId && activeConversationId.startsWith("temp-")) {
          const userMessageText = userMessage.content || "Nueva conversación"
          const newConv = await createConversationAPI(userMessageText)
          setActiveConversationId(newConv.id)
          setHookConversationId(newConv.id)
          await updateConversationAPI(newConv.id, { openaiThreadId: newConv.id })
          await addMessagesAPI(newConv.id, newMessages)
        } else if (activeConversationId) {
          await updateConversationAPI(activeConversationId, { openaiThreadId: activeConversationId })
          await addMessagesAPI(activeConversationId, newMessages)
        } else {
          const userMessageText = userMessage.content || "Nueva conversación"
          const newConv = await createConversationAPI(userMessageText)
          setActiveConversationId(newConv.id)
          setHookConversationId(newConv.id)
          await updateConversationAPI(newConv.id, { openaiThreadId: newConv.id })
          await addMessagesAPI(newConv.id, newMessages)
        }
      } catch (err) {
        console.error("[FloatingChat] Error saving conversation:", err)
        lastSavedAssistantIdRef.current = null
      } finally {
        isSavingRef.current = false
      }
    },
    onError: (err) => {
      console.error("[FloatingChat] Error:", err)
    },
  })

  React.useEffect(() => {
    if (activeConversationId && activeConversationId !== hookConversationId && !activeConversationId.startsWith("temp-")) {
      setHookConversationId(activeConversationId)
    }
  }, [activeConversationId, hookConversationId, setHookConversationId])

  React.useEffect(() => {
    if (isOpen && !isMinimized && messagesScrollRef.current) {
      const el = messagesScrollRef.current
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    }
  }, [messages, isOpen, isMinimized])

  React.useEffect(() => {
    if (isOpen && !isMinimized) {
      textareaRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  const handleNewChat = () => {
    setMessages([])
    setActiveConversationId(null)
    setThreadId(null)
    setHookConversationId(null)
    lastSavedAssistantIdRef.current = null
    isSavingRef.current = false
  }

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || isLoading) return
    setInputText("")

    if (!activeConversationId) {
      const tempId = `temp-${Date.now()}`
      setActiveConversationId(tempId)
      setHookConversationId(tempId)
    }

    await sendMessage({ text })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div
          className={cn(
            "flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl transition-all duration-200",
            isMinimized ? "h-14 w-72" : "h-[480px] w-[340px]",
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 bg-primary px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-foreground leading-none truncate">EVA Jurídico</p>
                {!isMinimized && (
                  <p className="text-xs text-primary-foreground/70 mt-0.5 truncate">
                    Historial en /member/assistant
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {!isMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground"
                  title="Nueva conversación"
                  onClick={handleNewChat}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground"
                onClick={() => setIsMinimized((v) => !v)}
              >
                {isMinimized ? (
                  <Maximize2 className="h-3.5 w-3.5" />
                ) : (
                  <Minimize2 className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                ref={messagesScrollRef}
                className="min-h-0 flex-1 basis-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3"
              >
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">¡Hola! Soy EVA</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Tus consultas se guardan en el historial (misma cuenta que en Asistente).
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex items-end gap-2",
                        msg.role === "user" ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      {msg.role === "assistant" && (
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                            EVA
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                          msg.role === "user"
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-muted text-foreground",
                        )}
                      >
                        {renderMessageContent(msg.content)}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-end gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                          EVA
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Error al procesar la solicitud. Intenta de nuevo.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t bg-background p-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe tu consulta..."
                    className="min-h-[36px] max-h-[100px] resize-none rounded-xl text-xs py-2"
                    rows={1}
                    disabled={isLoading}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl"
                    onClick={handleSend}
                    disabled={!inputText.trim() || isLoading}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                  Enter para enviar · Shift+Enter para nueva línea
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        size="icon"
        className="relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        onClick={() => {
          setIsOpen((v) => !v)
          setIsMinimized(false)
        }}
        aria-label="Abrir asistente jurídico EVA"
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Bot className="h-6 w-6" />
        )}
      </Button>
    </div>
  )
}
