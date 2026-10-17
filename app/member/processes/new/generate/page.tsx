"use client"

/**
 * Pantalla independiente para "Crear proceso y generar documentos".
 *
 * El proceso NO existe en BD al entrar: los datos llegan vía sessionStorage
 * (guardados por processes-page al pulsar "Crear y generar") y el proceso solo
 * se persiste cuando se genera el primer documento o se guarda el borrador.
 * Si el usuario sale sin hacer nada, no queda ningún borrador vacío.
 *
 * Cuando el proceso se crea, la URL se actualiza a /processes/[id]/generate
 * con history.replaceState (sin recargar: se conserva el estado del wizard).
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FileText, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GenerateDocumentsDialog, type ProcessData } from "@/components/member/generate-documents-dialog"
import { createProcess, type ProcessMapped } from "@/lib/supabase/client-data-access"

// Misma clave que usa processes-page al guardar el borrador de proceso nuevo
const NEW_PROCESS_DRAFT_KEY = "eva:new-process-draft"

interface NewProcessDraft {
  processData: ProcessData
  entity: { id: string; name: string } | null
  secretaryName: string
  processTypeName: string
}

export default function NewProcessGeneratePage() {
  const router = useRouter()
  const [draft, setDraft] = React.useState<NewProcessDraft | null>(null)
  const [checked, setChecked] = React.useState(false)
  const [isOpeningSmart, setIsOpeningSmart] = React.useState(false)
  const [smartError, setSmartError] = React.useState<string | null>(null)

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NEW_PROCESS_DRAFT_KEY)
      if (raw) setDraft(JSON.parse(raw))
    } catch {
      // sin borrador de proceso nuevo
    }
    setChecked(true)
  }, [])

  // Si no hay datos (acceso directo a la URL), volver a la lista de procesos
  React.useEffect(() => {
    if (checked && !draft) router.replace("/member/processes")
  }, [checked, draft, router])

  /** El proceso ya se creó en BD (primer doc o borrador): la URL pasa a ser la
      del proceso real sin recargar la página (se conserva el estado del wizard). */
  const handleProcessCreated = (created: ProcessMapped) => {
    window.history.replaceState(null, "", `/member/processes/${created.id}/generate`)
    try {
      sessionStorage.removeItem(NEW_PROCESS_DRAFT_KEY)
    } catch {
      // no crítico
    }
  }

  if (!checked || !draft) {
    return (
      <div className="container py-16 flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handleOpenSmartFill = async () => {
    if (!draft?.processData || isOpeningSmart) return
    setIsOpeningSmart(true)
    setSmartError(null)
    try {
      const created = await createProcess(draft.processData)
      try {
        sessionStorage.removeItem(NEW_PROCESS_DRAFT_KEY)
      } catch {
        // no crítico
      }
      router.push(`/member/processes/${created.id}/generate-smart`)
    } catch (err) {
      setSmartError(err instanceof Error ? err.message : "No se pudo abrir Generar con IA")
      setIsOpeningSmart(false)
    }
  }

  return (
    <div className="container py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/member/processes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Generar documentos</h1>
            <p className="text-sm text-muted-foreground">
              Proceso nuevo <span className="font-mono">{draft.processData.code}</span>
              {draft.entity?.name && ` · ${draft.entity.name}`}
              {" · se crea al generar el primer documento o guardar el borrador"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenSmartFill} disabled={isOpeningSmart}>
          {isOpeningSmart ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Completar con IA
        </Button>
      </div>
      {smartError && (
        <p className="text-sm text-destructive">{smartError}</p>
      )}

      <Card className="flex flex-col min-h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Por formulario
          </CardTitle>
          <CardDescription>
            Completa los campos de cada plantilla y genera los documentos. Paso a paso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col">
          <GenerateDocumentsDialog
            open={true}
            onOpenChange={() => {}}
            process={null}
            processData={draft.processData}
            entity={draft.entity as any}
            secretaryName={draft.secretaryName}
            processTypeName={draft.processTypeName}
            onProcessCreated={handleProcessCreated}
            onDocumentsGenerated={() => {}}
            embedded
          />
        </CardContent>
      </Card>
    </div>
  )
}
