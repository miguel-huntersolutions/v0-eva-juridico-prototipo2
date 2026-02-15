/**
 * RAG ingestion: download document from Google Drive and add to OpenAI vector store.
 * Used when a document is approved so the assistant can search it.
 */

import { createClient } from "@supabase/supabase-js"
import { OpenAI } from "openai"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { downloadFileFromDriveForServer } from "@/lib/google/drive"

const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID

/** Extract Google Drive file ID from webViewLink (e.g. https://drive.google.com/file/d/FILE_ID/view) */
export function extractDriveFileIdFromUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl || typeof fileUrl !== "string") return null
  const match = fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

export interface IngestResult {
  success: boolean
  openaiFileId?: string
  error?: string
}

/**
 * Download document from Drive, upload to OpenAI Files, and add to the vector store.
 * @param documentId - UUID of the document in our DB
 * @param userId - User ID for Drive OAuth (must have access to the file)
 */
export async function ingestDocumentToRag(documentId: string, userId: string): Promise<IngestResult> {
  if (!VECTOR_STORE_ID) {
    return { success: false, error: "OPENAI_VECTOR_STORE_ID is not configured" }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("id, name, file_url, created_by")
    .eq("id", documentId)
    .single()

  if (docError || !document) {
    return { success: false, error: "Document not found" }
  }

  const fileUrl = document.file_url as string | null
  const driveFileId = extractDriveFileIdFromUrl(fileUrl)
  if (!driveFileId) {
    return { success: false, error: "Document has no valid Google Drive file URL" }
  }

  // Try approver first (they have active session), then creator. Use service-role token lookup so RLS does not block.
  const creatorId = (document.created_by as string | null) || null
  const tryUserIds = creatorId && creatorId !== userId ? [userId, creatorId] : [userId]

  let buffer: Buffer | null = null
  let lastError: string | null = null
  for (const driveUserId of tryUserIds) {
    try {
      buffer = await downloadFileFromDriveForServer(driveUserId, driveFileId)
      break
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Failed to download from Drive"
    }
  }
  if (!buffer) {
    return { success: false, error: lastError || "Failed to download from Drive" }
  }

  if (!buffer.length) {
    return { success: false, error: "Downloaded file is empty" }
  }

  // OpenAI SDK expects fs.ReadStream; write to temp file then stream
  const baseName = (document.name || "document").replace(/[^a-zA-Z0-9._-]/g, "_")
  const ext = path.extname(baseName) || ".pdf"
  const safeName = baseName.endsWith(ext) ? baseName : baseName + ext
  const tmpPath = path.join(os.tmpdir(), `rag-${documentId.slice(0, 8)}-${Date.now()}-${safeName}`)

  try {
    fs.writeFileSync(tmpPath, buffer)
    const stream = fs.createReadStream(tmpPath)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const file = await openai.files.create({
      file: stream,
      purpose: "assistants",
    })

    await openai.vectorStores.files.create(VECTOR_STORE_ID, {
      file_id: file.id,
    })

    return { success: true, openaiFileId: file.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return { success: false, error: `OpenAI upload failed: ${msg}` }
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
    } catch {
      // ignore cleanup errors
    }
  }
}
