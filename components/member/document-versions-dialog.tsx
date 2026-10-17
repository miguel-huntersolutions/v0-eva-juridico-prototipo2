"use client"

import * as React from "react"
import { History, ExternalLink, Loader2, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Version = {
  id: string
  version: number
  status: string
  fileUrl: string | null
  fileSize: number | null
  createdAt: string
  createdByName: string | null
  isCurrent: boolean
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  in_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
}

/** RF-016 (CAP-04): historial de versiones de un documento. */
export function DocumentVersionsDialog({
  documentId,
  open,
  onOpenChange,
}: {
  documentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [documentName, setDocumentName] = React.useState("")
  const [versions, setVersions] = React.useState<Version[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open || !documentId) return
    let cancelled = false
    ;(async () => {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch(`/api/documents/${documentId}/versions`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Error al cargar versiones")
        if (cancelled) return
        setDocumentName(data.documentName || "")
        setVersions(data.versions || [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar versiones")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, documentId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de versiones
          </DialogTitle>
          <DialogDescription className="truncate">{documentName}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando versiones…
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-destructive">{error}</p>
        ) : versions.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No hay versiones registradas.</p>
        ) : (
          <ul className="divide-y overflow-y-auto flex-1 min-h-0">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    V{v.version}
                  </Badge>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {STATUS_LABELS[v.status] || v.status}
                      {v.isCurrent && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <CheckCircle2 className="h-3 w-3" /> vigente
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {v.createdByName || "—"} · {new Date(v.createdAt).toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>
                {v.fileUrl && (
                  <Button asChild size="sm" variant="ghost">
                    <a href={v.fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
