import { NextRequest, NextResponse } from "next/server"
import { downloadFileFromDrive, uploadDocumentToDrive, findFileByPath } from "@/lib/google/drive"
import { replaceTagsInDocx } from "@/lib/utils/document-generator"
import { getOrCreateProcessSpreadsheet, updateSheetData } from "@/lib/google/sheets"

/**
 * POST /api/generate-document
 * Generates a document from a template by replacing tags and uploads to Google Drive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      templatePath, // e.g., "plantillas/Contratación Directa/archivo.docx"
      replacements, // Object mapping tag names (without {{}}) to values
      processCode, // Process code for folder organization
      processId, // Process ID for database
      documentName, // Name for the generated document
      entityName, // Entity name for auto-replacement
      secretaryName, // Secretary name for auto-replacement
    } = body

    if (!templatePath || !replacements || !processCode || !documentName) {
      return NextResponse.json(
        { error: "Missing required fields: templatePath, replacements, processCode, documentName" },
        { status: 400 },
      )
    }

    // Find the template file in Google Drive
    const templateFileId = await findFileByPath(templatePath)
    if (!templateFileId) {
      return NextResponse.json({ error: "Template file not found in Google Drive" }, { status: 404 })
    }

    // Download the template
    const templateBuffer = await downloadFileFromDrive(templateFileId)

    // Add auto-replacements for ENTIDAD and SECRETARIA if provided
    const allReplacements = { ...replacements }
    if (entityName) {
      allReplacements.ENTIDAD = entityName
    }
    if (secretaryName) {
      allReplacements.SECRETARIA = secretaryName
    }

    // Replace tags in the document
    const generatedBuffer = await replaceTagsInDocx(templateBuffer, allReplacements)

    // Upload the generated document to Google Drive
    const uploadResult = await uploadDocumentToDrive(
      generatedBuffer,
      documentName,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      processCode,
    )

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
          file_url: uploadResult.drivePath, // Store the Drive path
          file_size: generatedBuffer.length,
          created_by: null,
        })
      } catch (dbError) {
        console.error("Error saving document to database:", dbError)
        // Don't fail the request if DB save fails, just log it
      }
    }

    // Save to Google Sheets
    let spreadsheetId: string | null = null
    let spreadsheetUrl: string | null = null
    try {
      spreadsheetId = await getOrCreateProcessSpreadsheet(processCode)
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      
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
      
      // Prepare data for the sheet
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

      await updateSheetData(spreadsheetId, "Documentos", headers, data)
    } catch (sheetsError) {
      console.error("Error saving to Google Sheets:", sheetsError)
      // Don't fail the request if Sheets fails, just log it
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

