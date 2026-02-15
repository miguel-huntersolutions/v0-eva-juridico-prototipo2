"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Bot, User, Send, Loader2, FileText, CheckCircle2, AlertCircle, Search, FileOutput } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { getTemplates, type Template, type ProcessMapped } from "@/lib/supabase/client-data-access"

const API_PATH = "/api/document-assistant"

type ChatMessage = { role: "user" | "assistant"; content: string }

interface DocumentAssistantDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  process: ProcessMapped | null
  onDocumentsGenerated?: () => void
  /** When true, render content inline (no modal); use for dedicated page */
  embedded?: boolean
}

export function DocumentAssistantDialog({
  open,
  onOpenChange,
  process,
  onDocumentsGenerated,
  embedded = false,
}: DocumentAssistantDialogProps) {
  const router = useRouter()
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = React.useState(false)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lastGeneration, setLastGeneration] = React.useState<{
    success: boolean
    documentName?: string
    error?: string
    driveUrl?: string
  } | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const processTypeId = process?.processTypeId
  const effectiveOpen = embedded ? !!process : open

  // Load templates when dialog opens and we have a process
  React.useEffect(() => {
    if (!effectiveOpen || !processTypeId || !process) {
      setTemplates([])
      setSessionId(null)
      setMessages([])
      setLastGeneration(null)
      setError(null)
      return
    }
    let cancelled = false
    setSessionId(crypto.randomUUID())
    setMessages([])
    setLastGeneration(null)
    setError(null)
    setLoadingTemplates(true)
    getTemplates(processTypeId)
      .then((data) => {
        if (!cancelled) setTemplates(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar plantillas")
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplates(false)
      })
    return () => {
      cancelled = true
    }
  }, [effectiveOpen, processTypeId, process?.id])

  // Send first message "Inicio" when we have sessionId, templates and process
  React.useEffect(() => {
    if (!effectiveOpen || !sessionId || templates.length === 0 || !process || messages.length > 0 || sending) return
    const templateIds = templates.map((t) => t.id)
    const context = {
      processId: process.id,
      processCode: process.code,
      entityId: process.entityId,
      entityName: process.entityName ?? "",
      secretaryId: process.secretaryId ?? undefined,
      secretaryName: process.secretaryName ?? "",
      processTypeId: process.processTypeId ?? "",
      processTypeName: process.processTypeName ?? undefined,
      templateIds,
    }
    setSending(true)
    setError(null)
    fetch(API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Inicio",
        sessionId,
        context,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          return
        }
        setMessages([
          { role: "user", content: "Inicio" },
          { role: "assistant", content: data.message ?? "" },
        ])
        if (data.generationResult) setLastGeneration(data.generationResult)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error de conexión"))
      .finally(() => setSending(false))
  }, [effectiveOpen, sessionId, templates, process, sending, messages.length])

  type QuickAction = { message: string; hintIntent: "rag_proactive" | "confirm_generate" }

  const sendMessage = React.useCallback(
    async (quickAction?: QuickAction) => {
      const text = quickAction ? quickAction.message : input.trim()
      if (!text || !sessionId || !process || templates.length === 0) return
      const templateIds = templates.map((t) => t.id)
      const context = {
        processId: process.id,
        processCode: process.code,
        entityId: process.entityId,
        entityName: process.entityName ?? "",
        secretaryId: process.secretaryId ?? undefined,
        secretaryName: process.secretaryName ?? "",
        processTypeId: process.processTypeId ?? "",
        processTypeName: process.processTypeName ?? undefined,
        templateIds,
      }
      if (!quickAction) setInput("")
      setMessages((prev) => [...prev, { role: "user", content: text }])
      setSending(true)
      setError(null)
      try {
        const body: Record<string, unknown> = {
          message: text,
          sessionId,
          context,
          conversationHistory: messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        }
        if (quickAction?.hintIntent) body.hintIntent = quickAction.hintIntent
        const res = await fetch(API_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setMessages((prev) => prev.slice(0, -1))
        return
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.message ?? "" }])
      if (data.generationResult) {
        setLastGeneration({
          success: data.generationResult.success,
          documentName: data.generationResult.documentName,
          error: data.generationResult.error,
          driveUrl: data.generationResult.driveUrl,
        })
        if (data.generationResult.success && onDocumentsGenerated) onDocumentsGenerated()
        // Si ya se generaron todos los documentos del proceso, volver al listado tras un breve delay
        const nextIdx = data.nextDocumentIndex ?? -1
        if (nextIdx >= templates.length && templates.length > 0) {
          setTimeout(() => router.push("/member/processes"), 2500)
        }
      }
      // Si el mensaje indica que no hay más plantillas (ej. usuario envió algo después de terminar)
      if (data.message && typeof data.message === "string" && data.message.includes("Ya se generaron todos los documentos")) {
        setTimeout(() => router.push("/member/processes"), 2500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión")
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setSending(false)
    }
  },
    [input, sessionId, process, templates, messages, onDocumentsGenerated],
  )

  React.useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const canSend = input.trim().length > 0 && !sending

  const headerBlock = embedded ? (
    <div className="border-b px-6 py-4 space-y-1.5">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Bot className="h-5 w-5" />
        Generar documentos con el asistente
      </h2>
      <p className="text-sm text-muted-foreground">
        {process ? (
          <>
            Proceso <span className="font-mono font-medium text-foreground">{process.code}</span>
            {process.entityName && ` · ${process.entityName}`}
          </>
        ) : (
          "Seleccione un proceso."
        )}
      </p>
    </div>
  ) : (
    <DialogHeader className="border-b px-6 py-4">
      <DialogTitle className="flex items-center gap-2">
        <Bot className="h-5 w-5" />
        Generar documentos con el asistente
      </DialogTitle>
      <DialogDescription>
        {process ? (
          <>
            Proceso <span className="font-mono font-medium text-foreground">{process.code}</span>
            {process.entityName && ` · ${process.entityName}`}
          </>
        ) : (
          "Seleccione un proceso."
        )}
      </DialogDescription>
    </DialogHeader>
  )

  const content = (
    <>
        {headerBlock}

        {error && (
          <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-6 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {lastGeneration && (
          <div
            className={cn(
              "flex items-center gap-2 border-b px-6 py-2 text-sm",
              lastGeneration.success
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {lastGeneration.success ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Documento generado: {lastGeneration.documentName}
                  {lastGeneration.driveUrl && (
                    <>
                      {" · "}
                      <a
                        href={lastGeneration.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        Abrir en Google Drive
                      </a>
                    </>
                  )}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 shrink-0" />
                {lastGeneration.error ?? "Error al generar"}
              </>
            )}
          </div>
        )}

        <ScrollArea className="min-h-[280px] flex-1 px-6 py-4">
          <div className="flex flex-col gap-4">
            {loadingTemplates && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando plantillas…
              </div>
            )}
            {!loadingTemplates && templates.length === 0 && effectiveOpen && process && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                No hay plantillas para este tipo de proceso.
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3 rounded-lg px-3 py-2",
                  msg.role === "user"
                    ? "ml-8 bg-primary/10"
                    : "mr-8 bg-muted/60"
                )}
              >
                {msg.role === "assistant" ? (
                  <Bot className="h-5 w-5 shrink-0 text-muted-foreground" />
                ) : (
                  <User className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm">
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3 rounded-lg bg-muted/60 px-3 py-2 mr-8">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">El asistente está respondiendo…</span>
              </div>
            )}
          </div>
          <div ref={scrollRef} />
        </ScrollArea>

        <div className="border-t px-6 py-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={sending || loadingTemplates || templates.length === 0}
              onClick={() =>
                sendMessage({
                  message: "Buscar datos automáticamente",
                  hintIntent: "rag_proactive",
                })
              }
            >
              <Search className="h-4 w-4" />
              Buscar datos automáticamente
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={sending || loadingTemplates || templates.length === 0}
              onClick={() =>
                sendMessage({
                  message: "Generar este documento",
                  hintIntent: "confirm_generate",
                })
              }
            >
              <FileOutput className="h-4 w-4" />
              Generar este documento
            </Button>
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="O escriba un mensaje (p. ej. buscar en Minuta, listo, adelante…)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              rows={2}
              className="min-h-0 resize-none"
              disabled={sending || loadingTemplates || templates.length === 0}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!canSend}
              size="icon"
              className="h-auto shrink-0 self-end"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
    </>
  )

  if (embedded) {
    return (
      <div className="flex flex-col h-full min-h-[400px] rounded-lg border bg-card">
        {content}
      </div>
    )
  }

  return (
    <Dialog open={effectiveOpen} onOpenChange={onOpenChange ?? (() => {})}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0">
        {content}
      </DialogContent>
    </Dialog>
  )
}
