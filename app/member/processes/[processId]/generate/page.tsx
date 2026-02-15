"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, FileText, Bot, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getProcessMapped, getProcessMappedForImpersonation, getEntities, getEntitiesForImpersonation, type ProcessMapped, type EntityMapped } from "@/lib/supabase/client-data-access"
import { useProfile } from "@/hooks/use-profile"
import { useImpersonation } from "@/lib/impersonation-context"
import { GenerateDocumentsDialog } from "@/components/member/generate-documents-dialog"
import { DocumentAssistantDialog } from "@/components/member/document-assistant-dialog"

const LOADING_MESSAGES = [
  "Preparando el agente…",
  "Conectando los flujos de IA…",
  "Cargando contexto del proceso…",
  "Listando plantillas disponibles…",
  "Inicializando asistente jurídico…",
]

function GenerateLoadingState() {
  const [index, setIndex] = React.useState(0)
  React.useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 2200)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="container py-16 flex flex-col items-center justify-center min-h-[320px] gap-8">
      <div className="relative flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Sparkles className="absolute -right-0.5 -top-0.5 h-5 w-5 text-primary animate-pulse" aria-hidden />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium text-foreground transition-opacity duration-300">
          {LOADING_MESSAGES[index]}
        </p>
        <p className="text-xs text-muted-foreground">Interfaz con IA · Eva Jurídico</p>
      </div>
    </div>
  )
}

export default function ProcessGeneratePage() {
  const params = useParams()
  const router = useRouter()
  const processId = params?.processId as string | undefined
  const { profile } = useProfile()
  const { isImpersonating, impersonatedOrg } = useImpersonation()
  const orgId = isImpersonating && impersonatedOrg ? impersonatedOrg.id : profile?.organization_id
  const [process, setProcess] = React.useState<ProcessMapped | null>(null)
  const [entities, setEntities] = React.useState<EntityMapped[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!processId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const processPromise = isImpersonating
      ? getProcessMappedForImpersonation(processId)
      : getProcessMapped(processId)
    const entitiesPromise = orgId
      ? isImpersonating
        ? getEntitiesForImpersonation(orgId)
        : getEntities(orgId)
      : Promise.resolve([])
    Promise.all([processPromise, entitiesPromise])
      .then(([p, entityList]) => {
        if (!cancelled) {
          setProcess(p ?? null)
          setEntities(Array.isArray(entityList) ? entityList : [])
        }
      })
      .catch(() => {
        if (!cancelled) setProcess(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [processId, orgId, isImpersonating])

  const entity = process ? entities.find((e) => e.id === process.entityId) ?? null : null
  const entityForDialog = entity ? { id: entity.id, name: entity.name } : null

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

  if (loading) {
    return <GenerateLoadingState />
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/member/processes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Generar documentos</h1>
          <p className="text-sm text-muted-foreground">
            Proceso <span className="font-mono">{process.code}</span>
            {process.entityName && ` · ${process.entityName}`}
          </p>
        </div>
      </div>

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
            process={process}
            entity={entityForDialog as any}
            secretaryName={process.secretaryName ?? ""}
            processTypeName={process.processTypeName}
            onDocumentsGenerated={() => router.refresh()}
            embedded
          />
        </CardContent>
      </Card>
    </div>
  )
}
