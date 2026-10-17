import { getAllUniqueTags } from "@/lib/utils/document-generator"
import type { GoogleAuthMode } from "@/lib/google/drive"
import { buildReplacementsForTemplates } from "./build-replacements"
import { generateSingleDocument, type GenerateSingleDocumentResult } from "./generate-single"
import type { McpTemplate } from "@/lib/mcp/templates"

export type GenerateBatchInput = {
  googleUserId: string
  createdBy: string
  processId: string
  processCode: string
  templates: McpTemplate[]
  formData: Record<string, string>
  tableData: Record<string, Array<Record<string, string>>>
  entityName: string
  entityId: string
  secretaryName: string
  googleAuthMode?: GoogleAuthMode
}

export type GeneratedDocumentInfo = {
  templateId: string
  templateName: string
  documentName: string
  webViewLink: string
  directLink: string
  drivePath: string
}

export type GenerateBatchResult = {
  documents: GeneratedDocumentInfo[]
  driveFolderUrl: string | null
  spreadsheetUrl: string | null
  errors: Array<{ templateName: string; error: string }>
}

export async function generateAllTemplates(input: GenerateBatchInput): Promise<GenerateBatchResult> {
  const replacements = buildReplacementsForTemplates(input.templates, input.formData, input.tableData)
  const dateStr = new Date().toISOString().split("T")[0]

  const documents: GeneratedDocumentInfo[] = []
  const errors: Array<{ templateName: string; error: string }> = []
  let driveFolderUrl: string | null = null
  let spreadsheetUrl: string | null = null

  for (const template of input.templates) {
    const documentName = `${template.name}_${input.processCode}_${dateStr}.docx`
    try {
      const result: GenerateSingleDocumentResult = await generateSingleDocument({
        googleUserId: input.googleUserId,
        createdBy: input.createdBy,
        templateId: template.id,
        templatePath: template.fileUrl,
        templateName: template.name,
        replacements,
        processCode: input.processCode,
        processId: input.processId,
        documentName,
        entityName: input.entityName,
        entityId: input.entityId,
        secretaryName: input.secretaryName,
        googleAuthMode: input.googleAuthMode,
      })

      documents.push({
        templateId: template.id,
        templateName: template.name,
        documentName: result.documentName,
        webViewLink: result.webViewLink,
        directLink: result.directLink,
        drivePath: result.drivePath,
      })

      if (result.processFolderUrl) driveFolderUrl = result.processFolderUrl
      if (result.spreadsheetUrl) spreadsheetUrl = result.spreadsheetUrl
    } catch (err) {
      errors.push({
        templateName: template.name,
        error: err instanceof Error ? err.message : "Error desconocido",
      })
    }
  }

  return { documents, driveFolderUrl, spreadsheetUrl, errors }
}

export { getAllUniqueTags }
