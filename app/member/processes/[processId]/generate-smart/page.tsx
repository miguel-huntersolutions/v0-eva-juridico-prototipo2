"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileText, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  getProcessMapped,
  getProcessMappedForImpersonation,
  getEntities,
  getEntitiesForImpersonation,
  getTemplates,
  type ProcessMapped,
  type EntityMapped,
} from "@/lib/supabase/client-data-access"
import { getAllUniqueTags } from "@/lib/utils/document-generator"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import { GenerateDocumentsDialog } from "@/components/member/generate-documents-dialog"
import { SmartFillContextStep } from "@/components/member/smart-fill-context-step"
import { SmartFillProgress, useSmartFillProgressCycle } from "@/components/member/smart-fill-progress"
import type { SmartFillResult } from "@/lib/smart-fill/types"

type PageStep = "loading" | "context" | "analyzing" | "form"

export default function ProcessGenerateSmartPage() {
  const params = useParams()
  const router = useRouter()
  const processId = params?.processId as string | undefined
  const { profile } = useProfile()
  const { isImpersonating, impersonatedOrg } = useImpersonation()
  const orgId = isImpersonating && impersonatedOrg ? impersonatedOrg.id : profile?.organization_id

  const [step, setStep] = React.useState<PageStep>("loading")
  const [process, setProcess] = React.useState<ProcessMapped | null>(null)
  const [entities, setEntities] = React.useState<EntityMapped[]>([])
  const [tags, setTags] = React.useState<string[]>([])
  const [prefilledFormData, setPrefilledFormData] = React.useState<Record<string, string> | null>(null)
  const [prefilledTableData, setPrefilledTableData] = React.useState<
    Record<string, Array<Record<string, string>>> | null
  >(null)
  const [fillStats, setFillStats] = React.useState<SmartFillResult["stats"] | null>(null)
  const [analyzeError, setAnalyzeError] = React.useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)

  const progressIndex = useSmartFillProgressCycle(isAnalyzing)

  React.useEffect(() => {
    if (!processId) {
      setStep("context")
      return
    }
    let cancelled = false
    setStep("loading")

    const processPromise = isImpersonating
      ? getProcessMappedForImpersonation(processId)
      : getProcessMapped(processId)
    const entitiesPromise = orgId
      ? isImpersonating
        ? getEntitiesForImpersonation(orgId)
        : getEntities(orgId)
      : Promise.resolve([])

    Promise.all([processPromise, entitiesPromise])
      .then(async ([p, entityList]) => {
        if (cancelled) return
        if (!p) {
          setProcess(null)
          setStep("context")
          return
        }
        setProcess(p)
        setEntities(Array.isArray(entityList) ? entityList : [])

        if (p.processTypeId) {
          const templates = await getTemplates(p.processTypeId, p.entityId)
          if (!cancelled) setTags(getAllUniqueTags(templates))
        }
        if (!cancelled) setStep("context")
      })
      .catch(() => {
        if (!cancelled) {
          setProcess(null)
          setStep("context")
        }
      })

    return () => {
      cancelled = true
    }
  }, [processId, orgId, isImpersonating])

  const entity = process ? entities.find((e) => e.id === process.entityId) ?? null : null
  const entityForDialog = entity ? { id: entity.id, name: entity.name } : null

  const handleAnalyze = async (userContext: string) => {
    if (!process?.processTypeId || tags.length === 0) {
      setAnalyzeError("No hay plantillas o etiquetas disponibles para este proceso.")
      return
    }

    setIsAnalyzing(true)
    setAnalyzeError(null)
    setStep("analyzing")

    try {
      const response = await fetch("/api/smart-fill-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userContext,
          tags,
          context: {
            processId: process.id,
            entityId: process.entityId,
            entityName: process.entityName ?? entity?.name ?? "",
            secretaryId: process.secretaryId,
            secretaryName: process.secretaryName ?? "",
            processTypeId: process.processTypeId,
            processTypeName: process.processTypeName ?? "",
            processObject: process.object ?? "",
            processDescription: process.description ?? "",
          },
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Error al analizar el contexto")
      }

      const result = data as SmartFillResult
      setPrefilledFormData(result.formData)
      setPrefilledTableData(result.tableData)
      setFillStats(result.stats)
      setStep("form")
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Error al analizar el contexto")
      setStep("context")
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!processId) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">Proceso no especificado.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/member/processes">Volver a procesos</Link>
        </Button>
      </div>
    )
  }

  if (step === "loading") {
    return (
      <div className="container py-16 flex flex-col items-center justify-center min-h-[320px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando proceso y plantillas…</p>
      </div>
    )
  }

  if (!process) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">No se encontró el proceso.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/member/processes">Volver a procesos</Link>
        </Button>
      </div>
    )
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
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generar con IA
            </h1>
            <p className="text-sm text-muted-foreground">
              Proceso <span className="font-mono">{process.code}</span>
              {process.entityName && ` · ${process.entityName}`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/member/processes/${process.id}/generate`}>
            <FileText className="h-4 w-4 mr-2" />
            Usar formulario manual
          </Link>
        </Button>
      </div>

      {step === "context" && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 1 · Contexto</CardTitle>
            <CardDescription>
              Describa el proceso en un solo texto. La IA completará las etiquetas antes de mostrar el formulario editable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SmartFillContextStep
              process={process}
              tags={tags}
              isSubmitting={isAnalyzing}
              error={analyzeError}
              onSubmit={handleAnalyze}
            />
          </CardContent>
        </Card>
      )}

      {step === "analyzing" && (
        <Card>
          <CardHeader>
            <CardTitle>Analizando contexto</CardTitle>
            <CardDescription>
              Completando etiquetas con IA y documentos indexados cuando aplique.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SmartFillProgress activePhaseIndex={progressIndex} />
          </CardContent>
        </Card>
      )}

      {step === "form" && prefilledFormData && (
        <>
          {fillStats && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Se completaron automáticamente {fillStats.filled} de {fillStats.total} etiquetas
                {fillStats.ragCount > 0 && ` (${fillStats.ragCount} desde documentos)`}.
                Revise y edite los campos antes de generar.
              </AlertDescription>
            </Alert>
          )}
          <Card className="flex flex-col min-h-[500px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Paso 2 · Revisar y generar
              </CardTitle>
              <CardDescription>
                Formulario pre-rellenado. Misma experiencia que el flujo manual; puede editar cualquier campo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col">
              <GenerateDocumentsDialog
                open={true}
                onOpenChange={() => {}}
                process={process}
                entity={entityForDialog as any}
                secretaryName={process.secretaryName ?? ""}
                processTypeName={process.processTypeName}
                prefilledFormData={prefilledFormData}
                prefilledTableData={prefilledTableData}
                onDocumentsGenerated={() => router.refresh()}
                embedded
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
