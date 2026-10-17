/**
 * Ingest documents into the RAG vector store (OpenAI).
 * Downloads the file from Google Drive (using document creator's tokens) and adds it to the vector store.
 */

import { createClient } from "@supabase/supabase-js"
import OpenAI, { toFile } from "openai"
import { downloadFileFromDriveForServer } from "@/lib/google/drive"

const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID

export interface IngestResult {
  success: boolean
  error?: string
  openaiFileId?: string
}

/**
 * Extract Google Drive file ID from file_url (webViewLink or direct link).
 */
function extractDriveFileId(fileUrl: string | null | undefined): string | null {
  if (!fileUrl || typeof fileUrl !== "string") return null
  // https://drive.google.com/file/d/FILE_ID/view
  const m1 = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1?.[1]) return m1[1]
  // https://drive.google.com/open?id=FILE_ID
  const m2 = fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2?.[1]) return m2[1]
  return null
}

/**
 * Ingest a document (by id) into the RAG vector store.
 * Fetches the document from DB, downloads the file from Drive, uploads to OpenAI Files, then adds to vector store.
 */
export async function ingestDocumentToRag(documentId: string, userId: string): Promise<IngestResult> {
  if (!VECTOR_STORE_ID) {
    return { success: false, error: "OPENAI_VECTOR_STORE_ID is not configured" }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: "Server configuration error" }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("id, file_url, created_by, name")
    .eq("id", documentId)
    .single()

  if (docError || !document) {
    return { success: false, error: "Document not found" }
  }

  const fileUrl = document.file_url
  const driveFileId = extractDriveFileId(fileUrl)
  if (!driveFileId) {
    return { success: false, error: "Document has no valid Google Drive file URL" }
  }

  // Use document creator for Drive download; fallback to current user
  const driveUserId = document.created_by || userId

  let buffer: Buffer
  try {
    buffer = await downloadFileFromDriveForServer(driveUserId, driveFileId)
  } catch (e) {
    return {
      success: false,
      error: `Failed to download from Drive: ${e instanceof Error ? e.message : "Unknown error"}`,
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return { success: false, error: "OPENAI_API_KEY is not configured" }
  }

  const openai = new OpenAI({ apiKey: openaiKey })

  // Determine file name and type for OpenAI
  const fileName = (document.name && document.name.trim()) || `document-${documentId.slice(0, 8)}.docx`
  const isPdf = fileName.toLowerCase().endsWith(".pdf")
  const mimeType = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

  let openaiFileId: string
  try {
    const uploadable = await toFile(buffer, fileName, { type: mimeType })
    const file = await openai.files.create({
      file: uploadable,
      purpose: "assistants",
    })
    openaiFileId = file.id
  } catch (e) {
    return {
      success: false,
      error: `Failed to upload file to OpenAI: ${e instanceof Error ? e.message : "Unknown error"}`,
    }
  }

  try {
    await openai.beta.vectorStores.files.create(VECTOR_STORE_ID, {
      file_id: openaiFileId,
    })
  } catch (e) {
    return {
      success: false,
      error: `Failed to add file to vector store: ${e instanceof Error ? e.message : "Unknown error"}`,
      openaiFileId,
    }
  }

  return { success: true, openaiFileId }
}
