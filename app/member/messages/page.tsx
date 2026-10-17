"use client"

/**
 * CAP-07 (CA-025.2): vista general del canal de comunicación.
 * Todas las conversaciones visibles para el usuario, ordenadas por último
 * mensaje, cada una con el código y la entidad del proceso.
 */

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquareText, Loader2, Building } from "lucide-react"
import { ProcessThreadDialog } from "@/components/member/process-thread-dialog"

interface Conversation {
  processId: string
  processCode: string
  processStatus?: string | null
  entityName: string
  messageCount: number
  lastMessageAt: string | null
  lastMessagePreview: string | null
  lastMessageAuthor: string | null
}

function statusLabel(status: string | null | undefined): string | null {
  if (!status) return null
  const map: Record<string, string> = {
    draft: "Borrador",
    in_progress: "En curso",
    review: "En revisión",
    completed: "Completado",
    archived: "Archivado",
  }
  return map[status] || status
}

function formatWhen(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "ahora"
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return d.toLocaleDateString("es-CO")
}

export default function MessagesPage() {
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<Conversation | null>(null)

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/messages")
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch {
      // silencioso
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <MessageSquareText className="h-6 w-6" />
          Canal de comunicación
        </h1>
        <p className="text-sm text-muted-foreground">
          Cada conversación está ligada a un proceso. Los mensajes tienen fecha y hora inalterables.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversaciones</CardTitle>
          <CardDescription>Ordenadas por el mensaje más reciente</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay procesos disponibles para conversar.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {conversations.map((c) => (
                <li key={c.processId}>
                  <button
                    type="button"
                    onClick={() => setSelected(c)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MessageSquareText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{c.processCode}</span>
                        {statusLabel(c.processStatus) && (
                          <Badge variant="outline" className="text-[10px]">
                            {statusLabel(c.processStatus)}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {c.entityName}
                        </span>
                      </div>
                      {c.lastMessagePreview ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {c.lastMessageAuthor ? `${c.lastMessageAuthor}: ` : ""}
                          {c.lastMessagePreview}
                        </p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">Sin mensajes aún</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {c.messageCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {c.messageCount}
                        </Badge>
                      )}
                      {c.lastMessageAt && (
                        <span className="text-[11px] text-muted-foreground">{formatWhen(c.lastMessageAt)}</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ProcessThreadDialog
        processId={selected?.processId ?? null}
        processCode={selected?.processCode}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            load() // refrescar conteos al cerrar
          }
        }}
      />
    </div>
  )
}
