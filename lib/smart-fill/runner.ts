import { ragProactive } from "@/lib/document-assistant/orchestrator"
import {
  applyDirectMappings,
  buildEmptyTableData,
  countFilled,
  getScalarTagsForSmartFill,
  mergeFormData,
} from "./tag-utils"
import {
  classifyTags,
  enrichFieldValues,
  extractFromUserContext,
  generateFieldValues,
} from "./ai-steps"
import type { SmartFillContext, SmartFillPhase, SmartFillResult } from "./types"

const USE_ASSISTANT_RAG = !!process.env.OPENAI_ASSISTANT_WORKFLOW_ID

function phase(id: string, label: string, status: SmartFillPhase["status"]): SmartFillPhase {
  return { id, label, status }
}

/** Main orchestrator for smart document field filling. */
export async function runSmartFill(
  userContext: string,
  allTags: string[],
  ctx: SmartFillContext,
): Promise<SmartFillResult> {
  const phases: SmartFillPhase[] = []
  const scalarTags = getScalarTagsForSmartFill(allTags)
  const tableData = buildEmptyTableData(allTags)

  let formData: Record<string, string> = Object.fromEntries(scalarTags.map((t) => [t, ""]))
  let ragCount = 0
  let generatedCount = 0
  let enrichedCount = 0

  // Phase 1: direct mappings
  const direct = applyDirectMappings(scalarTags, {
    entityName: ctx.entityName,
    secretaryName: ctx.secretaryName,
    processObject: ctx.processObject,
    processDescription: ctx.processDescription,
  })
  formData = mergeFormData(formData, direct)
  phases.push(
    phase(
      "direct",
      "Aplicando datos del proceso",
      Object.keys(direct).length > 0 ? "done" : "skipped",
    ),
  )

  // Phase 2: extract from user context
  const unfilledForExtract = scalarTags.filter((t) => !formData[t]?.trim())
  let extracted: Record<string, string> = {}
  if (unfilledForExtract.length > 0 && userContext.trim()) {
    extracted = await extractFromUserContext(userContext, unfilledForExtract, ctx)
    formData = mergeFormData(formData, extracted)
  }
  phases.push(
    phase(
      "extract",
      "Extrayendo datos del contexto",
      Object.keys(extracted).length > 0 ? "done" : unfilledForExtract.length === 0 ? "skipped" : "done",
    ),
  )

  // Phase 3: classify remaining tags
  const unfilled = scalarTags.filter((t) => !formData[t]?.trim())
  let classification = {
    rag: [] as string[],
    generate: [] as string[],
    extract: [] as string[],
    enrich: [] as string[],
    skip: [] as string[],
  }
  if (unfilled.length > 0) {
    classification = await classifyTags(scalarTags, ctx, formData)
  }
  phases.push(
    phase(
      "classify",
      "Clasificando etiquetas",
      unfilled.length > 0 ? "done" : "skipped",
    ),
  )

  // Phase 4: RAG
  const ragTags = classification.rag.filter((t) => !formData[t]?.trim())
  let ragResult: Record<string, string> = {}
  if (ragTags.length > 0 && USE_ASSISTANT_RAG) {
    ragResult = await ragProactive(
      {
        entityId: ctx.entityId,
        entityName: ctx.entityName,
        secretaryId: ctx.secretaryId,
        secretaryName: ctx.secretaryName,
        processTypeId: ctx.processTypeId,
        processTypeName: ctx.processTypeName,
      },
      ragTags,
      userContext,
    )
    formData = mergeFormData(formData, ragResult)
    ragCount = Object.keys(ragResult).length
    phases.push(phase("rag", "Consultando documentos indexados", ragCount > 0 ? "done" : "done"))
  } else {
    phases.push(
      phase(
        "rag",
        "Consultando documentos indexados",
        ragTags.length === 0 ? "skipped" : USE_ASSISTANT_RAG ? "skipped" : "skipped",
      ),
    )
  }

  // Phase 5: generate narrative fields
  const generateTags = [
    ...classification.generate,
    ...classification.extract.filter((t) => !formData[t]?.trim()),
  ].filter((t, i, arr) => arr.indexOf(t) === i && !formData[t]?.trim())

  let generated: Record<string, string> = {}
  if (generateTags.length > 0) {
    generated = await generateFieldValues(generateTags, userContext, ctx, formData)
    formData = mergeFormData(formData, generated)
    generatedCount = Object.keys(generated).length
  }
  phases.push(
    phase(
      "generate",
      "Generando campos narrativos",
      generatedCount > 0 ? "done" : generateTags.length === 0 ? "skipped" : "done",
    ),
  )

  // Phase 6: enrich
  const enrichTags = classification.enrich.filter((t) => formData[t]?.trim())
  let enriched: Record<string, string> = {}
  if (enrichTags.length > 0) {
    enriched = await enrichFieldValues(enrichTags, formData, ctx)
    formData = mergeFormData(formData, enriched)
    enrichedCount = Object.keys(enriched).length
  }
  phases.push(
    phase(
      "enrich",
      "Enriqueciendo redacción jurídica",
      enrichedCount > 0 ? "done" : enrichTags.length === 0 ? "skipped" : "done",
    ),
  )

  const filled = countFilled(scalarTags, formData)

  return {
    formData,
    tableData,
    phases,
    stats: {
      filled,
      total: scalarTags.length,
      ragCount,
      generatedCount,
      enrichedCount,
    },
  }
}
