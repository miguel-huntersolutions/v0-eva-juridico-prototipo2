"use client"

import * as React from "react"
import { Paperclip, Upload, ExternalLink, Loader2, FileImage, FileSpreadsheet, FileText, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Attachment = {
  id: string
  name: string
  file_url: string | null
  mime_type: string | null
  file_size: number | null
  created_at: string
}

function iconFor(mime: string | null) {
  if (!mime) return File
  if (mime.startsWith("image/")) return FileImage
  if (mime.includes("sheet") || mime.includes("excel")) return FileSpreadsheet
  return FileText
}

function formatSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** RF-037 / B18 (CAP-02): adjuntos del proceso (PDF, imágenes, Word, Excel). */
export function ProcessAttachments({ processId }: { processId: string }) {
  const [attachments, setAttachments] = React.useState<Attachment[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/process-attachments?processId=${processId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al cargar adjuntos")
      setAttachments(data.attachments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar adjuntos")
    } finally {
      setIsLoading(false)
    }
  }, [processId])

  React.useEffect(() => {
    load()
  }, [load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("processId", processId)
      const res = await fetch("/api/process-attachments", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al subir el archivo")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el archivo")
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Paperclip className="h-4 w-4" />
              Adjuntos del proceso
            </CardTitle>
            <CardDescription>Anexos, actas y evidencias (PDF, imágenes, Word, Excel)</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Cargar archivo
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
            onChange={handleUpload}
          />
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando adjuntos…
          </div>
        ) : attachments.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No hay adjuntos en este proceso.</p>
        ) : (
          <ul className="divide-y">
            {attachments.map((a) => {
              const Icon = iconFor(a.mime_type)
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(a.file_size)} · {new Date(a.created_at).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                  </div>
                  {a.file_url && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
