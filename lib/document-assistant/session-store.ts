/**
 * Document assistant session persistence (SPEC-002).
 * getSession / upsertSession for document_assistant_sessions.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  DocumentAssistantContext,
  DocumentAssistantSession,
  DocumentAssistantSessionRow,
} from "./types"
import { sessionRowToSession } from "./types"

const TABLE = "document_assistant_sessions"

export async function getSession(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<DocumentAssistantSession | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }
  if (!data) return null

  const row = data as unknown as DocumentAssistantSessionRow
  row.template_ids = Array.isArray(row.template_ids) ? row.template_ids : []
  return sessionRowToSession(row)
}

export async function upsertSession(
  supabase: SupabaseClient,
  session: {
    sessionId: string
    userId: string
    context: DocumentAssistantContext
    documentState: Record<string, string>
    currentDocumentIndex: number
    templateIds: string[]
  }
): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(
    {
      session_id: session.sessionId,
      user_id: session.userId,
      context: session.context as unknown as Record<string, unknown>,
      document_state: session.documentState as unknown as Record<string, unknown>,
      current_document_index: session.currentDocumentIndex,
      template_ids: session.templateIds as unknown as string[],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  )
  if (error) throw error
}

export async function deleteSession(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId)
  if (error) throw error
}
