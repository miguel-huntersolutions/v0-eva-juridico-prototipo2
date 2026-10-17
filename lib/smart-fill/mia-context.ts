/**
 * Marcador de ampliación con IA en el contexto libre.
 *
 * Marcador principal: `...` (tres puntos)
 * Alias legacy: `(MIA)`
 *
 * Ejemplos:
 *   OBJETO: compra de equipos ...
 *   OBJETO: compra de equipos (MIA). Monto: 2500000
 *   ... El contrato es necesario porque...
 *   Justificación breve ...
 */

import type { SmartFillContext } from "@/lib/smart-fill/types"

/** Token que indica “ampliar con IA” (sufijo o prefijo en la línea). */
const EXPAND_TOKEN = /(?:\(MIA\)|\.{3})/i

export type MiaSegment = {
  label?: string
  originalText: string
  /** Texto que sigue al marcador en la misma línea (si hay). */
  trailingText?: string
  /** Línea original completa */
  sourceSpan: string
}

export type MiaExpansion = MiaSegment & {
  expandedText: string
}

export type MiaPreprocessResult = {
  processedContext: string
  expansions: MiaExpansion[]
}

export function contextHasMiaMarker(userContext: string): boolean {
  return userContext.split(/\r?\n/).some((line) => EXPAND_TOKEN.test(line))
}

function parseExpandLine(line: string): MiaSegment | null {
  const trimmed = line.trim()
  if (!trimmed || !EXPAND_TOKEN.test(trimmed)) return null

  // label: texto ... | (MIA) [resto de línea]
  const labeled = trimmed.match(/^([^:]+):\s*(.+?)\s*(?:\(MIA\)|\.{3})\s*(.*)$/i)
  if (labeled) {
    const originalText = labeled[2].trim()
    if (!originalText) return null
    return {
      label: labeled[1].trim(),
      originalText,
      trailingText: labeled[3]?.trim() || undefined,
      sourceSpan: trimmed,
    }
  }

  // ... texto | (MIA) texto
  const prefix = trimmed.match(/^(?:\(MIA\)|\.{3})\s*(.+)$/i)
  if (prefix) {
    const originalText = prefix[1].trim()
    if (!originalText) return null
    return {
      originalText,
      sourceSpan: trimmed,
    }
  }

  // texto ... | texto (MIA) [resto]
  const suffix = trimmed.match(/^(.+?)\s*(?:\(MIA\)|\.{3})\s*(.*)$/i)
  if (suffix) {
    const originalText = suffix[1].trim()
    if (!originalText) return null
    return {
      originalText,
      trailingText: suffix[2]?.trim() || undefined,
      sourceSpan: trimmed,
    }
  }

  return null
}

/** Extrae segmentos marcados para ampliar con IA, línea por línea. */
export function extractMiaSegments(userContext: string): MiaSegment[] {
  const segments: MiaSegment[] = []
  for (const line of userContext.split(/\r?\n/)) {
    const seg = parseExpandLine(line)
    if (seg) segments.push(seg)
  }
  return segments
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

function buildReplacement(seg: MiaSegment, expandedText: string): string {
  const trailing = seg.trailingText ? (seg.trailingText.startsWith(".") ? seg.trailingText : `. ${seg.trailingText}`) : ""
  if (seg.label) {
    return trailing ? `${seg.label}: ${expandedText}${trailing}` : `${seg.label}: ${expandedText}`
  }
  return expandedText
}

/** Expande segmentos marcados con improveText y reemplaza en el contexto. */
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

      const replacement = buildReplacement(seg, finalText)
      processedContext = processedContext.replace(seg.sourceSpan, replacement)
    } catch (err) {
      console.error("[mia-context] expand error:", err)
      const fallback = buildReplacement(seg, seg.originalText)
      expansions.push({ ...seg, expandedText: seg.originalText })
      processedContext = processedContext.replace(seg.sourceSpan, fallback)
    }
  }

  return { processedContext, expansions }
}

/** Quita marcadores de ampliación que hayan quedado en valores de campos. */
export function stripExpandMarkersFromValue(value: string): string {
  return value
    .replace(/\(MIA\)/gi, "")
    .replace(/\.{3}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}
