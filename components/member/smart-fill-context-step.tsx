"use client"

import * as React from "react"
import { Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getScalarTagsForSmartFill } from "@/lib/smart-fill/tag-utils"
import { parseDynamicTableTagToken } from "@/lib/utils/template-helpers"
import type { ProcessMapped } from "@/lib/supabase/client-data-access"

type SmartFillContextStepProps = {
  process: ProcessMapped
  tags: string[]
  isSubmitting?: boolean
  error?: string | null
  onSubmit: (userContext: string) => void
}

export function SmartFillContextStep({
  process,
  tags,
  isSubmitting = false,
  error = null,
  onSubmit,
}: SmartFillContextStepProps) {
  const [userContext, setUserContext] = React.useState("")

  const scalarTags = React.useMemo(() => getScalarTagsForSmartFill(tags), [tags])
  const tableCount = React.useMemo(
    () => tags.filter((t) => parseDynamicTableTagToken(t)).length,
    [tags],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userContext.trim() || isSubmitting) return
    onSubmit(userContext.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contexto del proceso</CardTitle>
          <CardDescription>
            Proceso <span className="font-mono">{process.code}</span>
            {process.entityName && ` · ${process.entityName}`}
            {process.secretaryName && ` · ${process.secretaryName}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {process.object?.trim() && (
            <p>
              <span className="font-medium text-foreground">Objeto (BD):</span> {process.object}
            </p>
          )}
          {process.description?.trim() && (
            <p>
              <span className="font-medium text-foreground">Descripción (BD):</span>{" "}
              {process.description.length > 200
                ? `${process.description.slice(0, 200)}…`
                : process.description}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Etiquetas a completar
            <Badge variant="secondary">{scalarTags.length}</Badge>
          </CardTitle>
          <CardDescription>
            La IA usará estas etiquetas junto con su contexto para pre-rellenar el formulario.
            {tableCount > 0 && " Las tablas dinámicas se completan manualmente en el formulario."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {scalarTags.map((tag) => (
              <Badge key={tag} variant="outline" className="font-mono text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="user-context">
          Describa el contexto del proceso
        </Label>
        <Textarea
          id="user-context"
          placeholder="Ej: Contrato directo por $2.500.000 para compra de equipos de cómputo. Municipio de Manizales. Plazo 30 días. Objeto: adquisición de 5 portátiles para la Secretaría de Educación…"
          value={userContext}
          onChange={(e) => setUserContext(e.target.value)}
          rows={8}
          className="resize-y min-h-[160px]"
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Incluya montos, fechas, objeto, instrucciones o cualquier dato que deba reflejarse en los documentos.
        </p>
        <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3 mt-2">
          Escriba <span className="font-mono font-medium text-foreground">...</span> junto a un texto breve para que la IA lo
          amplíe con redacción jurídica antes de completar los campos. Ejemplos:{" "}
          <span className="font-mono">OBJETO: compra de equipos ...</span> o{" "}
          <span className="font-mono">... El contrato es necesario porque…</span>
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!userContext.trim() || isSubmitting} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Analizar y completar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
