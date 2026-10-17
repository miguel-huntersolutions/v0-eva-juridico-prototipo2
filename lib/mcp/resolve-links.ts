import { getAppUrl } from "@/lib/app-config"
import type { GenerateBatchResult } from "@/lib/document-generation/generate-batch"
import { getMcpServiceClient } from "./service-client"

export type McpDocumentLink = {
  templateId?: string
  templateName?: string
  documentName: string
  webViewLink: string
  directLink?: string
  drivePath?: string
}

export type McpResolvedLinks = {
  driveFolderUrl: string | null
  spreadsheetUrl: string | null
  portalProcessUrl: string
  documents: McpDocumentLink[]
  /** URLs planas para que el bot las muestre directamente */
  documentUrls: string[]
}

export async function resolveMcpGenerationLinks(
  processId: string,
  batch: GenerateBatchResult,
): Promise<McpResolvedLinks> {
  const portalProcessUrl = `${getAppUrl()}/member/processes/${processId}`

  let driveFolderUrl = batch.driveFolderUrl
  let spreadsheetUrl = batch.spreadsheetUrl
  let documents: McpDocumentLink[] = batch.documents.map((d) => ({
    templateId: d.templateId,
    templateName: d.templateName,
    documentName: d.documentName,
    webViewLink: d.webViewLink,
    directLink: d.directLink,
    drivePath: d.drivePath,
  }))

  if (documents.length === 0 || !driveFolderUrl) {
    const supabase = getMcpServiceClient()
    const { data: process } = await supabase
      .from("processes")
      .select("drive_folder_url, spreadsheet_url")
      .eq("id", processId)
      .maybeSingle()

    if (!driveFolderUrl && process?.drive_folder_url) {
      driveFolderUrl = process.drive_folder_url
    }
    if (!spreadsheetUrl && process?.spreadsheet_url) {
      spreadsheetUrl = process.spreadsheet_url
    }

    if (documents.length === 0) {
      const { data: dbDocs } = await supabase
        .from("documents")
        .select("name, file_url")
        .eq("process_id", processId)
        .order("created_at", { ascending: true })

      if (dbDocs?.length) {
        documents = dbDocs
          .filter((d) => d.file_url)
          .map((d) => ({
            documentName: d.name,
            webViewLink: d.file_url as string,
          }))
      }
    }
  }

  const documentUrls = [
    ...documents.map((d) => d.webViewLink).filter(Boolean),
    ...(driveFolderUrl ? [driveFolderUrl] : []),
    ...(spreadsheetUrl ? [spreadsheetUrl] : []),
  ]

  return {
    driveFolderUrl,
    spreadsheetUrl,
    portalProcessUrl,
    documents,
    documentUrls,
  }
}
