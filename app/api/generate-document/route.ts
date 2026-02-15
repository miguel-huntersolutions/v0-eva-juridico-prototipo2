import { NextRequest, NextResponse } from "next/server"
import { createReadStream } from "fs"
import { unlink, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { downloadFileFromDrive, uploadDocumentToDrive, uploadDocumentToDriveFromStream, findFileByPath } from "@/lib/google/drive"
import { replaceTagsInDocx } from "@/lib/utils/document-generator"
import { getOrCreateProcessSpreadsheet, updateSheetData } from "@/lib/google/sheets"
import { createServerClient } from "@/lib/supabase/server"
import { hasValidTokens } from "@/lib/google/oauth"
import { getGenerateDocumentMaxDuration } from "@/lib/app-config"

export const maxDuration = getGenerateDocumentMaxDuration()

/**
 * POST /api/generate-document
 * Generates a document from a template by replacing tags and uploads to Google Drive
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const hasTokens = await hasValidTokens(user.id)
    if (!hasTokens) {
      return NextResponse.json(
        { error: "Google authentication required", needsAuth: true },
        { status: 401 },
      )
    }

    const body = await request.json()
    const {
      templatePath, // e.g., "plantillas/Contratación Directa/archivo.docx"
      replacements, // Object mapping tag names (without {{}}) to values
      processCode, // Process code for folder organization
      processId, // Process ID for database
      documentName, // Name for the generated document
      entityName, // Entity name for auto-replacement
      entityId, // Entity ID to get logo
      secretaryName, // Secretary name for auto-replacement
      createdBy, // User ID who created the document
    } = body

    if (!templatePath || !replacements || !processCode || !documentName) {
      return NextResponse.json(
        { error: "Missing required fields: templatePath, replacements, processCode, documentName" },
        { status: 400 },
      )
    }

    // Extract fileId from templatePath if it's in the format "fileId:xxx|path:yyy"
    // Otherwise, try to find by path
    let templateFileId: string | null = null
    
    if (templatePath.startsWith("fileId:")) {
      // Extract fileId from the stored format
      const fileIdMatch = templatePath.match(/fileId:([^|]+)/)
      if (fileIdMatch && fileIdMatch[1]) {
        templateFileId = fileIdMatch[1]
      }
    }
    if (!templateFileId) {
      templateFileId = await findFileByPath(user.id, templatePath)
    }
    if (!templateFileId) {
      return NextResponse.json({ 
        error: "Template file not found in Google Drive. Please ensure the template was uploaded correctly.",
        details: "If the template was uploaded by another user, the fileId must be stored in the database."
      }, { status: 404 })
    }

    // Download the template
    // Try with current user first, but if it fails (file belongs to another user),
    // we'll try to find a superadmin user with valid tokens
    let templateBuffer: Buffer
    try {
      templateBuffer = await downloadFileFromDrive(user.id, templateFileId)
    } catch (downloadError) {
      // If download fails, the file might belong to another user (e.g., superadmin)
      // Try to find a user with valid tokens who might have access
      // For now, we'll try with the current user again but with better error handling
      // In the future, we could query for superadmin users with valid tokens
      throw new Error(
        `No se pudo acceder al archivo del template. ` +
        `Si las plantillas están en un Drive de equipo (Shared Drive), la cuenta de Google con la que estás conectado en la app debe tener acceso a ese Drive. ` +
        `Pide al administrador que te agregue al Drive de equipo de la organización. ` +
        `Error: ${downloadError instanceof Error ? downloadError.message : "Unknown error"}`
      )
    }

    // Get entity logo if entityId is provided
    let entityLogoUrl: string | null = null
    if (entityId) {
      try {
        const { getEntity } = await import("@/lib/supabase/data-access")
        const entity = await getEntity(entityId)
        if (entity && entity.logo_url) {
          entityLogoUrl = entity.logo_url
        }
      } catch (err) {
        // Continue without logo if fetch fails
      }
    }

    // Add auto-replacements for ENTIDAD and SECRETARIA if provided
    const allReplacements = { ...replacements }
    if (entityName) {
      allReplacements.ENTIDAD = entityName
    }
    if (secretaryName) {
      allReplacements.SECRETARIA = secretaryName
    }

    // Replace tags in the document (including logo if present)
    const generatedBuffer = await replaceTagsInDocx(templateBuffer, allReplacements, entityLogoUrl)

    if (!processCode) {
      return NextResponse.json(
        { error: "Process code is required for folder organization" },
        { status: 400 },
      )
    }

    const mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024 // 5 MB: subir por stream para no duplicar pico de memoria

    let uploadResult
    if (generatedBuffer.length >= LARGE_FILE_THRESHOLD) {
      const tmpPath = join(tmpdir(), `eva-doc-${Date.now()}-${process.pid}.docx`)
      try {
        await writeFile(tmpPath, new Uint8Array(generatedBuffer))
        const stream = createReadStream(tmpPath)
        uploadResult = await uploadDocumentToDriveFromStream(
          user.id,
          stream,
          documentName,
          mimeType,
          processCode,
        )
      } finally {
        await unlink(tmpPath).catch(() => {})
      }
    } else {
      uploadResult = await uploadDocumentToDrive(
        user.id,
        generatedBuffer,
        documentName,
        mimeType,
        processCode,
      )
    }

    // Save document to database if processId is provided
    if (processId) {
      try {
        const { createDocument } = await import("@/lib/supabase/data-access")
        await createDocument({
          process_id: processId,
          name: documentName,
          type: "generated", // or extract from template name
          version: 1,
          status: "draft",
          file_url: uploadResult.webViewLink, // Store the Google Drive URL
          file_size: generatedBuffer.length,
          created_by: createdBy || user.id,
        })
      } catch {
        // Don't fail the request if DB save fails
      }
    }

    // Save to Google Sheets
    // Only create spreadsheet if we have data to write
    let spreadsheetId: string | null = null
    let spreadsheetUrl: string | null = null
    try {
      // Prepare data for the sheet first
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

      // Only create/get spreadsheet if we have data to write
      if (data.length > 0) {
        spreadsheetId = await getOrCreateProcessSpreadsheet(user.id, processCode)
        spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
        
        // Use updateSheetData which handles appending and headers automatically
        await updateSheetData(user.id, spreadsheetId, "Documentos", headers, data)
        
        // Update process with spreadsheet info if processId is provided
        if (processId && spreadsheetId) {
          try {
            const { updateProcess } = await import("@/lib/supabase/data-access")
            await updateProcess(processId, {
              spreadsheet_id: spreadsheetId,
              spreadsheet_url: spreadsheetUrl,
            } as any)
          } catch {
            // Don't fail if update fails
          }
        }
      }
    } catch {
      // Don't fail the request if Sheets fails
    }

    if (processId && uploadResult.processFolderId) {
      try {
        const { updateProcess } = await import("@/lib/supabase/data-access")
        await updateProcess(processId, {
          drive_folder_id: uploadResult.processFolderId,
          drive_folder_url: uploadResult.processFolderUrl,
        } as any)
      } catch {
        // Don't fail if update fails
      }
    }

    return NextResponse.json({
      success: true,
      fileId: uploadResult.fileId,
      webViewLink: uploadResult.webViewLink,
      directLink: uploadResult.directLink,
      drivePath: uploadResult.drivePath,
      documentName,
      spreadsheetId,
      spreadsheetUrl,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

