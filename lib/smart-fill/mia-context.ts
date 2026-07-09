/**
 * Marcador (MIA) = "Mejorar / ampliar con IA" en el contexto libre.
 *
 * Ejemplos:
 *   OBJETO: compra de equipos (MIA)
 *   (MIA) El contrato es necesario porque...
 *   Justificación breve (MIA)
 */

import type { SmartFillContext } from "@/lib/smart-fill/types"

const MIA_MARKER = /\(MIA\)/i

export type MiaSegment = {
  label?: string
  originalText: string
  /** Fragmento original en el contexto incluyendo (MIA) */
  sourceSpan: string
}

export type MiaExpansion = MiaSegment & {
  expandedText: string
}

export type MiaPreprocessResult = {
  processedContext: string
  expansions: MiaExpansion[]
}

/** Detecta si el contexto usa el marcador (MIA). */
export function contextHasMiaMarker(userContext: string): boolean {
  return MIA_MARKER.test(userContext)
}

/** Extrae segmentos marcados con (MIA) línea por línea. */
export function extractMiaSegments(userContext: string): MiaSegment[] {
  const segments: MiaSegment[] = []
  const lines = userContext.split(/\r?\n/)

  for (const line of lines) {
    if (!MIA_MARKER.test(line)) continue
    const trimmed = line.trim()
    if (!trimmed) continue

    // label: texto (MIA)
    const labeled = trimmed.match(/^([^:]+):\s*(.+)\(MIA\)\s*$/i)
    if (labeled) {
      segments.push({
        label: labeled[1].trim(),
        originalText: labeled[2].trim(),
        sourceSpan: trimmed,
      })
      continue
    }

    // (MIA) texto
    const prefix = trimmed.match(/^\(MIA\)\s*(.+)$/i)
    if (prefix) {
      segments.push({
        originalText: prefix[1].trim(),
        sourceSpan: trimmed,
      })
      continue
    }

    // texto (MIA)
    const suffix = trimmed.match(/^(.+?)\s*\(MIA\)\s*$/i)
    if (suffix) {
      segments.push({
        originalText: suffix[1].trim(),
        sourceSpan: trimmed,
      })
    }
  }

  return segments.filter((s) => s.originalText.length > 0)
}

function labelToFieldName(label?: string): string | undefined {
  if (!label) return undefined
  const n = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_")
  if (/OBJETO/.test(n)) return "object"
  if (/DESCRIPCION|DETALLE|ALCANCE/.test(n)) return "description"
  return undefined
}

/** Expande segmentos (MIA) con improveText y reemplaza en el contexto. */
export async function preprocessMiaContext(
  userContext: string,
  ctx: SmartFillContext,
): Promise<MiaPreprocessResult> {
  const segments = extractMiaSegments(userContext)
  if (segments.length === 0) {
    return { processedContext: userContext, expansions: [] }
  }

  const { improveText } = await import("@/lib/ai-chat/improve-text")
  let processedContext = userContext
  const expansions: MiaExpansion[] = []

  for (const seg of segments) {
    try {
      const fieldName = labelToFieldName(seg.label)
      const expandedText = await improveText({
        text: seg.originalText,
        fieldName,
        fieldLabel: seg.label,
        entityName: ctx.entityName,
        secretaryName: ctx.secretaryName,
        processTypeName: ctx.processTypeName,
      })

      const finalText = expandedText?.trim() || seg.originalText
      expansions.push({ ...seg, expandedText: finalText })

      // Reemplazar solo la primera ocurrencia del span en el contexto
      const replacement = seg.label
        ? `${seg.label}: ${finalText}`
        : finalText
      processedContext = processedContext.replace(seg.sourceSpan, replacement)
    } catch (err) {
      console.error("[mia-context] expand error:", err)
      expansions.push({ ...seg, expandedText: seg.originalText })
      processedContext = processedContext.replace(seg.sourceSpan, seg.originalText)
    }
  }

  return { processedContext, expansions }
}
