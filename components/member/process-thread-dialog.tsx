"use client"

/**
 * CAP-07 (RF-025/026/027): hilo de comunicación de un proceso.
 * - Mensajes con autor, fecha y hora inalterables (CA-025.4: no se editan ni
 *   borran; la corrección es un mensaje nuevo).
 * - Polling cada 8s mientras el diálogo está abierto (CA-025.1: < 10s sin
 *   recargar).
 * - Adjuntos PDF/Word/Excel/imagen de hasta 25 MB (RF-027): se suben por
 *   /api/process-attachments (quedan en la carpeta del proceso en Drive y en
 *   la lista de adjuntos del proceso) y se referencian en el mensaje.
 */

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, Paperclip, X, FileText } from "lucide-react"

interface ThreadMessage {
  id: string
  body: string
  createdAt: string
  authorId: string | null
  authorName: string
  authorRole: string | null
  isMine: boolean
  attachment: { id: string; name: string; fileUrl: string; mimeType: string } | null
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  superadmin: "Admin",
  member: "Asesor",
  entity_contact: "Entidad",
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString("es-CO")} ${d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`
}

export function ProcessThreadDialog({
  processId,
  processCode,
  open,
  onOpenChange,
}: {
  processId: string | null
  processCode?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [messages, setMessages] = React.useState<ThreadMessage[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const load = React.useCallback(async () => {
    if (!processId) return
    try {
      const res = await fetch(`/api/processes/${processId}/messages`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {
      // silencioso: el hilo reintenta en el siguiente ciclo de polling
    }
  }, [processId])

  // Carga inicial + polling cada 8s con el diálogo abierto (CA-025.1)
  React.useEffect(() => {
    if (!open || !processId) return
    setIsLoading(true)
    load().finally(() => setIsLoading(false))
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [open, processId, load])

  // Autoscroll al final cuando llegan mensajes
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, open])

  const handleSend = async () => {
    if (!processId || (!draft.trim() && !pendingFile)) return
    setIsSending(true)
    setSendError(null)
    try {
      // 1. Si hay adjunto, subirlo primero (queda en Drive + adjuntos del proceso)
      let attachmentId: string | null = null
      if (pendingFile) {
        const formData = new FormData()
        formData.append("file", pendingFile)
        formData.append("processId", processId)
        const upRes = await fetch("/api/process-attachments", { method: "POST", body: formData })
        const upData = await upRes.json().catch(() => ({}))
        if (!upRes.ok) throw new Error(upData.error || "No se pudo subir el adjunto")
        attachmentId = upData.attachment?.id ?? null
      }

      // 2. Crear el mensaje
      const res = await fetch(`/api/processes/${processId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim(), attachmentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el mensaje")

      setDraft("")
      setPendingFile(null)
      await load()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Error al enviar")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>Hilo del proceso {processCode ?? ""}</DialogTitle>
          <DialogDescription>
            Conversación ligada al proceso. Los mensajes no se pueden editar ni borrar; si te equivocas, envía una
            corrección.
          </DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} className="min-h-[200px] flex-1 space-y-3 overflow-y-auto rounded-md border p-3">
          {isLoading && messages.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay mensajes. Escribe el primero para abrir el hilo.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    m.isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className={`text-xs font-medium ${m.isMine ? "text-primary-foreground/90" : ""}`}>
                      {m.authorName}
                    </span>
                    {m.authorRole && (
                      <Badge
                        variant="outline"
                        className={`h-4 px-1 text-[10px] ${m.isMine ? "border-primary-foreground/40 text-primary-foreground/90" : ""}`}
                      >
                        {ROLE_LABELS[m.authorRole] ?? m.authorRole}
                      </Badge>
                    )}
                    <span className={`text-[10px] ${m.isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {formatDateTime(m.createdAt)}
                    </span>
                  </div>
                  {m.body && m.body !== "(adjunto)" && (
                    <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  )}
                  {m.attachment && (
                    <a
                      href={m.attachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-1 flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${
                        m.isMine
                          ? "border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
                          : "hover:bg-accent"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {m.attachment.name}
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {sendError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {sendError}
          </p>
        )}

        {pendingFile && (
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
            <Paperclip className="h-3.5 w-3.5" />
            <span className="flex-1 truncate">{pendingFile.name}</span>
            <span className="text-xs text-muted-foreground">
              {(pendingFile.size / 1024 / 1024).toFixed(1)} MB
            </span>
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Quitar adjunto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setPendingFile(f)
              e.target.value = ""
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title="Adjuntar archivo (PDF, Word, Excel o imagen, máx. 25 MB)"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe un mensaje…"
            className="min-h-[44px] flex-1 resize-none"
            rows={2}
            maxLength={5000}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0"
            onClick={handleSend}
            disabled={isSending || (!draft.trim() && !pendingFile)}
            title="Enviar"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
