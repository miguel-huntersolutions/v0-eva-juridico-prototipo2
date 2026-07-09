import { runSmartFill } from "@/lib/smart-fill/runner"
import type { SmartFillContext } from "@/lib/smart-fill/types"
import { getAllUniqueTags, generateAllTemplates } from "@/lib/document-generation/generate-batch"
import { hasValidTokens } from "@/lib/google/oauth"
import { getMcpIntegrationUserId } from "./config"
import { buildGenerationGaps } from "./gaps"
import {
  assertEntityAccess,
  assertSecretaryBelongsToEntity,
  getEntityById,
  getProcessTypeById,
} from "./entity-access"
import { createProcessServer, generateProcessCodeServer } from "./process-helpers"
import { getTemplatesForMcp } from "./templates"
import { resolveChannelUser, type ResolvedMcpUser } from "./resolve-user"
import type { McpGenerateSmartRequest } from "./types"
import { isImageTag } from "@/lib/utils/template-helpers"

export type McpAutoGenerateResult = {
  status: "complete" | "partial" | "blocked"
  processId: string
  processCode: string
  driveFolderUrl: string | null
  spreadsheetUrl: string | null
  documents: Array<{
    templateId: string
    templateName: string
    documentName: string
    webViewLink: string
    drivePath: string
  }>
  gaps: ReturnType<typeof buildGenerationGaps>
  miaExpansions?: Array<{ label?: string; originalText: string; expandedText: string }>
  fillStats: {
    filled: number
    total: number
    miaCount: number
  }
  errors?: Array<{ templateName: string; error: string }>
}

async function resolveActor(params: {
  channel: McpGenerateSmartRequest["channel"]
  externalUserId: string
  phone?: string
}): Promise<ResolvedMcpUser> {
  const result = await resolveChannelUser({
    channel: params.channel,
    externalId: params.externalUserId,
    phone: params.phone,
  })
  if (!result.ok) throw new Error(result.error)
  return result.user
}

function inferProcessObject(userContext: string): string {
  const firstLine = userContext.split(/\r?\n/).find((l) => l.trim())?.trim() || ""
  return firstLine.slice(0, 500) || "Proceso generado vía canal externo"
}

export async function mcpAutoGenerateSmart(
  body: McpGenerateSmartRequest,
): Promise<McpAutoGenerateResult> {
  const actor = await resolveActor({
    channel: body.channel,
    externalUserId: body.externalUserId,
    phone: body.phone,
  })

  const access = await assertEntityAccess(actor, body.entityId)
  if (!access.ok) throw new Error(access.error)

  const secretaryCheck = await assertSecretaryBelongsToEntity(body.secretaryId, body.entityId)
  if (!secretaryCheck.ok) throw new Error(secretaryCheck.error)

  const entity = await getEntityById(body.entityId)
  const processType = await getProcessTypeById(body.processTypeId)
  if (!entity || !processType) throw new Error("Entidad o tipo de proceso no encontrado.")

  const integrationUserId = getMcpIntegrationUserId()
  if (!integrationUserId) {
    throw new Error("EVA_MCP_INTEGRATION_USER_ID no configurado.")
  }

  const hasGoogle = await hasValidTokens(integrationUserId)
  if (!hasGoogle) {
    throw new Error("Usuario de integración sin Google vinculado.")
  }

  const templates = await getTemplatesForMcp(body.processTypeId, body.entityId)
  if (templates.length === 0) {
    throw new Error("No hay plantillas para este tipo de proceso y entidad.")
  }

  const allTags = getAllUniqueTags(templates)

  const processCode = await generateProcessCodeServer(body.processTypeId)
  const processObject = inferProcessObject(body.userContext)

  const process = await createProcessServer({
    code: processCode,
    object: processObject,
    description: body.userContext.slice(0, 2000),
    entityId: body.entityId,
    secretaryId: body.secretaryId,
    processTypeId: body.processTypeId,
    createdBy: actor.profileId,
    status: "in_progress",
  })

  const smartCtx: SmartFillContext = {
    processId: process.id,
    entityId: body.entityId,
    entityName: entity.name,
    secretaryId: body.secretaryId,
    secretaryName: secretaryCheck.name,
    processTypeId: body.processTypeId,
    processTypeName: processType.name,
    processObject,
    processDescription: body.userContext.slice(0, 2000),
  }

  const fill = await runSmartFill(body.userContext, allTags, smartCtx)
  const gaps = buildGenerationGaps(allTags, fill.formData)

  const criticalGaps = gaps.filter((g) => g.type === "image" || isImageTag(g.tag || ""))
  if (!body.allowPartial && criticalGaps.length > 0) {
    return {
      status: "blocked",
      processId: process.id,
      processCode: process.code,
      driveFolderUrl: null,
      spreadsheetUrl: null,
      documents: [],
      gaps,
      miaExpansions: fill.miaExpansions,
      fillStats: {
        filled: fill.stats.filled,
        total: fill.stats.total,
        miaCount: fill.stats.miaCount,
      },
    }
  }

  const batch = await generateAllTemplates({
    googleUserId: integrationUserId,
    createdBy: actor.profileId,
    processId: process.id,
    processCode: process.code,
    templates,
    formData: fill.formData,
    tableData: fill.tableData,
    entityName: entity.name,
    entityId: body.entityId,
    secretaryName: secretaryCheck.name,
  })

  const hasErrors = batch.errors.length > 0
  const hasDocs = batch.documents.length > 0

  return {
    status: hasErrors && !hasDocs ? "blocked" : hasErrors || gaps.length > 0 ? "partial" : "complete",
    processId: process.id,
    processCode: process.code,
    driveFolderUrl: batch.driveFolderUrl,
    spreadsheetUrl: batch.spreadsheetUrl,
    documents: batch.documents,
    gaps,
    miaExpansions: fill.miaExpansions,
    fillStats: {
      filled: fill.stats.filled,
      total: fill.stats.total,
      miaCount: fill.stats.miaCount,
    },
    errors: batch.errors.length > 0 ? batch.errors : undefined,
  }
}
