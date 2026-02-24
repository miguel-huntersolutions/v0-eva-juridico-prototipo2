"use client"

import * as React from "react"
import { Loader2, History, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AuditEntry {
  id: string
  fromStatus: string
  toStatus: string
  fromStatusLabel: string
  toStatusLabel: string
  changedByName: string | null
  changedByRole: string | null
  comment: string | null
  createdAt: string
}

export function DocumentAuditLog({ documentId, className }: { documentId: string; className?: string }) {
  const [audit, setAudit] = React.useState<AuditEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [expanded, setExpanded] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/documents/${documentId}/audit`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar auditoría")
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setAudit(data.audit ?? [])
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [documentId])

  const roleLabel = (role: string | null) => {
    if (!role) return ""
    const r: Record<string, string> = {
      superadmin: "Superadmin",
      admin: "Administrador",
      member: "Miembro",
    }
    return r[role] ?? role
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleString("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      })
    } catch {
      return iso
    }
  }

  return (
    <div className={cn("rounded-lg border bg-muted/30", className)}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <History className="h-4 w-4" />
        Auditoría del documento
        {audit.length > 0 && (
          <span className="text-muted-foreground font-normal">({audit.length} cambio{audit.length !== 1 ? "s" : ""})</span>
        )}
      </button>
      {expanded && (
        <div className="border-t px-4 py-3">
          {loading && (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando historial...
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive py-2">{error}</p>
          )}
          {!loading && !error && audit.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">Aún no hay cambios de estado registrados.</p>
          )}
          {!loading && !error && audit.length > 0 && (
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {audit.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{entry.fromStatusLabel}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{entry.toStatusLabel}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(entry.createdAt)}
                      {entry.changedByName && ` · ${entry.changedByName}`}
                      {entry.changedByRole && ` (${roleLabel(entry.changedByRole)})`}
                    </span>
                  </div>
                  {entry.comment && (
                    <div className="mt-1 rounded bg-muted/60 px-2 py-1.5 text-muted-foreground border-l-2 border-amber-500/50">
                      {entry.comment}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
