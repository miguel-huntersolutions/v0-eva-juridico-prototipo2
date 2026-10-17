/**
 * Types and Zod schemas for document-assistant (RFC-002 / SPEC-002).
 * Request/response and session state contracts.
 */

import { z } from "zod"

const MAX_MESSAGE_LENGTH = 4096
const MAX_TEMPLATE_IDS = 50

export const DocumentAssistantContextSchema = z.object({
  processId: z.string().uuid(),
  processCode: z.string().min(1),
  entityId: z.string().uuid(),
  entityName: z.string().min(1),
  secretaryId: z.string().uuid().optional(),
  secretaryName: z.string().min(1),
  processTypeId: z.string().uuid(),
  processTypeName: z.string().optional(),
  templateIds: z.array(z.string().uuid()).min(1).max(MAX_TEMPLATE_IDS),
})

export const DocumentAssistantRequestSchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  sessionId: z.string().uuid(),
  context: DocumentAssistantContextSchema,
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
  /** When set, backend uses this intent directly (e.g. from quick-action buttons). */
  hintIntent: z.enum(["rag_proactive", "rag_ondemand", "confirm_generate"]).optional(),
  /** Contexto indicado por el usuario para la búsqueda RAG (ej. municipio Manizales). Se guarda en sesión. */
  ragContext: z.string().max(500).optional(),
})

export const DocumentAssistantResponseSchema = z.object({
  message: z.string(),
  documentState: z.record(z.string(), z.string()).optional(),
  intent: z.string().optional(),
  triggerGeneration: z.boolean().optional(),
  nextDocumentIndex: z.number().int().min(0).optional(),
  sessionId: z.string().uuid(),
  generationResult: z
    .object({
      success: z.boolean(),
      documentName: z.string().optional(),
      error: z.string().optional(),
      driveUrl: z.string().url().optional(),
    })
    .optional(),
})

export type DocumentAssistantContext = z.infer<typeof DocumentAssistantContextSchema>
export type DocumentAssistantRequest = z.infer<typeof DocumentAssistantRequestSchema>
export type DocumentAssistantResponse = z.infer<typeof DocumentAssistantResponseSchema>

/** Session row as stored in DB (document_assistant_sessions). */
export interface DocumentAssistantSessionRow {
  session_id: string
  user_id: string
  context: DocumentAssistantContext
  document_state: Record<string, string>
  current_document_index: number
  template_ids: string[]
  created_at: string
  updated_at: string
}

/** In-memory session shape for the orchestrator. */
export interface DocumentAssistantSession {
  sessionId: string
  userId: string
  context: DocumentAssistantContext
  documentState: Record<string, string>
  currentDocumentIndex: number
  templateIds: string[]
  createdAt: string
  updatedAt: string
}

export function sessionRowToSession(row: DocumentAssistantSessionRow): DocumentAssistantSession {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    context: row.context,
    documentState: row.document_state ?? {},
    currentDocumentIndex: row.current_document_index ?? 0,
    templateIds: row.template_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
