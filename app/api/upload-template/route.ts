import { NextRequest, NextResponse } from "next/server"
import { uploadFileToDrive, updateFileInDrive, deleteFileFromDrive, findFileByPath } from "@/lib/google/drive"
import { createServerClient } from "@/lib/supabase/server"
import { hasValidTokens } from "@/lib/google/oauth"

// Plantillas grandes: más tiempo para subir
export const maxDuration = 120

/**
 * POST /api/upload-template
 * Uploads a template file to Google Drive in the structure: plantillas/{processTypeName}/
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has valid Google OAuth tokens
    const hasTokens = await hasValidTokens(user.id)
    if (!hasTokens) {
      return NextResponse.json(
        { error: "Google authentication required", needsAuth: true },
        { status: 401 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const fileId = formData.get("fileId") as string | null // For updates
    const processTypeName = formData.get("processTypeName") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!processTypeName) {
      return NextResponse.json({ error: "No processTypeName provided" }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const fileName = file.name
    const mimeType = file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    let result

    if (fileId) {
      // Update existing file
      result = await updateFileInDrive(user.id, fileId, buffer, mimeType, fileName, processTypeName)
    } else {
      // Upload new file
      result = await uploadFileToDrive(user.id, buffer, fileName, mimeType, processTypeName)
    }

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
      directLink: result.directLink,
      drivePath: result.drivePath, // Full path in Drive: plantillas/{processTypeName}/{fileName}
      fileName,
    })
  } catch (error) {
    console.error("Error uploading template:", error)
    return NextResponse.json(
      {
        error: "Failed to upload template",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/upload-template
 * Deletes a template file from Google Drive
 * Accepts either fileId or drivePath
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has valid Google OAuth tokens
    const hasTokens = await hasValidTokens(user.id)
    if (!hasTokens) {
      return NextResponse.json(
        { error: "Google authentication required", needsAuth: true },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("fileId")
    const drivePath = searchParams.get("drivePath")

    let actualFileId: string | null = null

    if (fileId) {
      actualFileId = fileId
    } else if (drivePath) {
      // Try to find the file by path
      actualFileId = await findFileByPath(user.id, drivePath)
      if (!actualFileId) {
        return NextResponse.json({ error: "File not found in Google Drive" }, { status: 404 })
      }
    } else {
      return NextResponse.json({ error: "No fileId or drivePath provided" }, { status: 400 })
    }

    await deleteFileFromDrive(user.id, actualFileId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json(
      {
        error: "Failed to delete template",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

