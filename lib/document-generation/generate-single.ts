import { createReadStream } from "fs"
import { unlink, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import {
  downloadFileFromDrive,
  uploadDocumentToDrive,
  uploadDocumentToDriveFromStream,
  findFileByPath,
  type GoogleAuthMode,
} from "@/lib/google/drive"
import { replaceTagsInDocx } from "@/lib/utils/document-generator"
import { getOrCreateProcessSpreadsheet, updateSheetData } from "@/lib/google/sheets"
import { getTemplateById, getProcess, getEntity, createDocument, updateProcess } from "@/lib/supabase/data-access"
import { getMcpServiceClient } from "@/lib/mcp/service-client"

export type GenerateSingleDocumentInput = {
  googleUserId: string
  createdBy: string
  templateId: string
  templatePath: string
  templateName: string
  replacements: Record<string, unknown>
  processCode: string
  processId: string
  documentName: string
  entityName?: string
  entityId?: string
  secretaryName?: string
  googleAuthMode?: GoogleAuthMode
}

export type GenerateSingleDocumentResult = {
  success: true
  fileId: string
  webViewLink: string
  directLink: string
  drivePath: string
  documentName: string
  processFolderUrl?: string
  spreadsheetUrl?: string | null
}

export async function generateSingleDocument(
  input: GenerateSingleDocumentInput,
): Promise<GenerateSingleDocumentResult> {
  const {
    googleUserId,
    createdBy,
    templateId,
    templatePath,
    replacements,
    processCode,
    processId,
    documentName,
    entityName,
    entityId,
    secretaryName,
    googleAuthMode = "session",
  } = input

  const useServiceRole = googleAuthMode === "service-role"
  const supabase = useServiceRole ? getMcpServiceClient() : null

  const tpl = useServiceRole
    ? await (async () => {
        const { data, error } = await supabase!
          .from("templates")
          .select("*")
          .eq("id", templateId)
          .single()
        if (error) throw error
        return data
      })()
    : await getTemplateById(templateId)

  if (tpl.file_url !== templatePath) {
    throw new Error("Los datos de la plantilla no coinciden con la selección.")
  }

  if (tpl.entity_id && processId) {
    const proc = useServiceRole
      ? await (async () => {
          const { data, error } = await supabase!.from("processes").select("*").eq("id", processId).single()
          if (error) throw error
          return data
        })()
      : await getProcess(processId)
    if (proc.entity_id !== tpl.entity_id) {
      throw new Error("Esta plantilla no corresponde a la entidad del proceso.")
    }
  }

  let templateFileId: string | null = null
  if (templatePath.startsWith("fileId:")) {
    const fileIdMatch = templatePath.match(/fileId:([^|]+)/)
    if (fileIdMatch?.[1]) templateFileId = fileIdMatch[1]
  }
  if (!templateFileId) {
    templateFileId = await findFileByPath(googleUserId, templatePath, googleAuthMode)
  }
  if (!templateFileId) {
    throw new Error("Plantilla no encontrada en Google Drive.")
  }

  const templateBuffer = await downloadFileFromDrive(googleUserId, templateFileId, googleAuthMode)

  let entityLogoUrl: string | null = null
  if (entityId) {
    try {
      const entity = useServiceRole
        ? await (async () => {
            const { data } = await supabase!.from("entities").select("*").eq("id", entityId).single()
            return data
          })()
        : await getEntity(entityId)
      if (entity?.logo_url) entityLogoUrl = entity.logo_url
    } catch {
      // continue without logo
    }
  }

  const allReplacements = { ...replacements } as Record<string, unknown>
  if (entityName) allReplacements.ENTIDAD = entityName
  if (secretaryName) allReplacements.SECRETARIA = secretaryName

  const generatedBuffer = await replaceTagsInDocx(
    templateBuffer,
    allReplacements,
    entityLogoUrl,
    null,
  )

  const mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  const LARGE = 5 * 1024 * 1024
  let uploadResult

  // RF-009 (CAP-02): estructura Entidad/Secretaría/Proceso cuando hay entidad.
  const folderPath = entityName
    ? { entityName, secretaryName: secretaryName ?? null, processCode }
    : undefined

  if (generatedBuffer.length >= LARGE) {
    const tmpPath = join(tmpdir(), `eva-mcp-${Date.now()}.docx`)
    try {
      await writeFile(tmpPath, new Uint8Array(generatedBuffer))
      const stream = createReadStream(tmpPath)
      uploadResult = await uploadDocumentToDriveFromStream(
        googleUserId,
        stream,
        documentName,
        mimeType,
        processCode,
        googleAuthMode,
        folderPath,
      )
    } finally {
      await unlink(tmpPath).catch(() => {})
    }
  } else {
    uploadResult = await uploadDocumentToDrive(
      googleUserId,
      generatedBuffer,
      documentName,
      mimeType,
      processCode,
      googleAuthMode,
      folderPath,
    )
  }

  // RF-010 (CAP-02): el registro en DB NO es opcional; si falla, la generación falla
  // (el archivo ya está en Drive y se reporta su enlace para conciliación).
  // RF-015 (CAP-04): versionado. Nueva generación = versión N+1 del mismo nombre.
  let nextVersion = 1
  try {
    const versionQuery = useServiceRole
      ? await supabase!
          .from("documents")
          .select("version")
          .eq("process_id", processId)
          .eq("name", documentName)
          .order("version", { ascending: false })
          .limit(1)
      : await (await import("@/lib/supabase/server")).createServerClient().then((s) =>
          s
            .from("documents")
            .select("version")
            .eq("process_id", processId)
            .eq("name", documentName)
            .order("version", { ascending: false })
            .limit(1),
        )
    const rows = (versionQuery as any).data
    if (rows && rows.length > 0) nextVersion = (rows[0].version || 1) + 1
  } catch {
    // si falla la consulta de versión, se queda en 1
  }

  const docPayload = {
    process_id: processId,
    name: documentName,
    type: "generated",
    version: nextVersion,
    status: "draft" as const,
    file_url: uploadResult.webViewLink,
    file_size: generatedBuffer.length,
    created_by: createdBy,
  }
  try {
    if (useServiceRole) {
      const { error } = await supabase!.from("documents").insert(docPayload)
      if (error) throw error
    } else {
      await createDocument(docPayload)
    }
  } catch (dbError) {
    throw new Error(
      `El documento se creó en Drive pero no se pudo registrar en la plataforma. ` +
        `Enlace: ${uploadResult.webViewLink}. ` +
        `Causa: ${dbError instanceof Error ? dbError.message : "desconocida"}`,
    )
  }

  let spreadsheetUrl: string | null = null
  try {
    const headers = ["Fecha", "Documento", "Plantilla", "Ruta en Drive", "Link Drive", "Tags Utilizados"]
    const tagsUsed = Object.keys(allReplacements).join(", ")
    const data = [
      {
        Fecha: new Date().toISOString(),
        Documento: documentName,
        Plantilla: templatePath,
        "Ruta en Drive": uploadResult.drivePath,
        "Link Drive": uploadResult.webViewLink,
        "Tags Utilizados": tagsUsed,
      },
    ]
    const spreadsheetId = await getOrCreateProcessSpreadsheet(googleUserId, processCode, googleAuthMode)
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    await updateSheetData(googleUserId, spreadsheetId, "Documentos", headers, data, googleAuthMode)
    const processUpdate = {
      spreadsheet_id: spreadsheetId,
      spreadsheet_url: spreadsheetUrl,
    }
    if (useServiceRole) {
      await supabase!.from("processes").update(processUpdate).eq("id", processId)
    } else {
      await updateProcess(processId, processUpdate as any)
    }
  } catch {
    // non-fatal
  }

  if (uploadResult.processFolderId) {
    try {
      const folderUpdate = {
        drive_folder_id: uploadResult.processFolderId,
        drive_folder_url: uploadResult.processFolderUrl,
      }
      if (useServiceRole) {
        await supabase!.from("processes").update(folderUpdate).eq("id", processId)
      } else {
        await updateProcess(processId, folderUpdate as any)
      }
    } catch {
      // non-fatal
    }
  }

  return {
    success: true,
    fileId: uploadResult.fileId,
    webViewLink: uploadResult.webViewLink,
    directLink: uploadResult.directLink,
    drivePath: uploadResult.drivePath,
    documentName,
    processFolderUrl: uploadResult.processFolderUrl,
    spreadsheetUrl,
  }
}
