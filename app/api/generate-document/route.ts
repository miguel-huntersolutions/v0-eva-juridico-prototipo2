import { NextRequest, NextResponse } from "next/server"
import { downloadFileFromDrive, uploadDocumentToDrive, findFileByPath } from "@/lib/google/drive"
import { replaceTagsInDocx } from "@/lib/utils/document-generator"
import { getOrCreateProcessSpreadsheet, updateSheetData } from "@/lib/google/sheets"
import { createServerClient } from "@/lib/supabase/server"
import { hasValidTokens } from "@/lib/google/oauth"

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
      console.error("[generate-document] Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[generate-document] User authenticated:", user.id)

    // Check if user has valid Google OAuth tokens
    const hasTokens = await hasValidTokens(user.id)
    console.log("[generate-document] Has valid tokens:", hasTokens)
    
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

    console.log("[generate-document] Request received", {
      processCode: processCode || "MISSING",
      processId: processId || "EMPTY",
      documentName: documentName || "MISSING",
      hasProcessCode: !!processCode,
      hasReplacements: !!replacements,
    })

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
        console.log("[generate-document] Using stored fileId:", templateFileId)
      }
    }
    
    // If no fileId found, try to find by path
    // Note: This will only work if the file is in the current user's Drive
    // For templates uploaded by superadmin, we need the fileId
    if (!templateFileId) {
      console.log("[generate-document] FileId not found, searching by path:", templatePath)
      templateFileId = await findFileByPath(user.id, templatePath)
    }
    
    if (!templateFileId) {
      console.error("[generate-document] Template file not found. templatePath:", templatePath)
      return NextResponse.json({ 
        error: "Template file not found in Google Drive. Please ensure the template was uploaded correctly.",
        details: "If the template was uploaded by another user, the fileId must be stored in the database."
      }, { status: 404 })
    }
    
    console.log("[generate-document] Found template fileId:", templateFileId)

    // Download the template
    // Try with current user first, but if it fails (file belongs to another user),
    // we'll try to find a superadmin user with valid tokens
    let templateBuffer: Buffer
    try {
      templateBuffer = await downloadFileFromDrive(user.id, templateFileId)
    } catch (downloadError) {
      console.log("[generate-document] Failed to download with current user, trying to find file owner...")
      // If download fails, the file might belong to another user (e.g., superadmin)
      // Try to find a user with valid tokens who might have access
      // For now, we'll try with the current user again but with better error handling
      // In the future, we could query for superadmin users with valid tokens
      throw new Error(
        `No se pudo acceder al archivo del template. ` +
        `El archivo puede pertenecer a otro usuario. ` +
        `Asegúrate de que el template fue subido correctamente y que tienes permisos para accederlo. ` +
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
        console.warn("[generate-document] Could not fetch entity logo:", err)
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

    // Upload the generated document to Google Drive
    if (!processCode) {
      console.error("[generate-document] ERROR: processCode is missing or empty!")
      return NextResponse.json(
        { error: "Process code is required for folder organization" },
        { status: 400 },
      )
    }
    
    console.log("[generate-document] Uploading document with processCode:", processCode)
    const uploadResult = await uploadDocumentToDrive(
      user.id,
      generatedBuffer,
      documentName,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      processCode,
    )

    console.log("[generate-document] Upload result:", {
      fileId: uploadResult.fileId,
      processFolderId: uploadResult.processFolderId,
      processFolderUrl: uploadResult.processFolderUrl,
      drivePath: uploadResult.drivePath,
    })

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
      } catch (dbError) {
        console.error("Error saving document to database:", dbError)
        // Don't fail the request if DB save fails, just log it
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
          } catch (updateError) {
            console.error("Error updating process with spreadsheet info:", updateError)
            // Don't fail if update fails
          }
        }
      }
    } catch (sheetsError) {
      console.error("Error saving to Google Sheets:", sheetsError)
      // Don't fail the request if Sheets fails, just log it
    }
    
    // Update process with drive folder info if processId is provided
    console.log("[generate-document] Updating process with drive folder info:", {
      processId,
      processFolderId: uploadResult.processFolderId,
      processFolderUrl: uploadResult.processFolderUrl,
    })
    
    if (processId && uploadResult.processFolderId) {
      try {
        const { updateProcess } = await import("@/lib/supabase/data-access")
        const updateData = {
          drive_folder_id: uploadResult.processFolderId,
          drive_folder_url: uploadResult.processFolderUrl,
        }
        console.log("[generate-document] Calling updateProcess with:", { processId, updateData })
        const updated = await updateProcess(processId, updateData as any)
        console.log("[generate-document] Process updated successfully:", updated)
      } catch (updateError) {
        console.error("[generate-document] Error updating process with drive folder info:", updateError)
        // Don't fail if update fails, but log the error
      }
    } else {
      console.warn("[generate-document] Skipping drive folder update:", {
        hasProcessId: !!processId,
        hasProcessFolderId: !!uploadResult.processFolderId,
      })
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
    console.error("Error generating document:", error)
    return NextResponse.json(
      {
        error: "Failed to generate document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

