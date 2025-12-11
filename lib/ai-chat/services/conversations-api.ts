/**
 * API service for conversations persistence using Supabase
 * Handles all database operations for conversations CRUD
 */

import { createClient } from "@/lib/supabase/client"
import type { ChatConversation, ChatMessage } from "../types"

// Get Supabase client instance
const supabase = createClient()

/**
 * Convert Supabase conversation row to ChatConversation
 */
function mapConversationFromDB(row: any): ChatConversation {
  return {
    id: row.id,
    title: row.title,
    preview: row.preview,
    messages: [], // Will be loaded separately
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id || undefined,
  }
}

/**
 * Convert Supabase message row to ChatMessage
 */
function mapMessageFromDB(row: any): ChatMessage {
  return {
    id: row.id,
    role: row.role as "user" | "assistant",
    content: row.content,
    timestamp: row.timestamp,
  }
}

/**
 * Fetch all conversations for the current user
 */
export async function fetchConversations(userId?: string): Promise<ChatConversation[]> {
  try {
    let query = supabase.from("conversations").select("*").order("updated_at", { ascending: false })

    // If userId is provided, filter by it (RLS will also enforce this)
    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query

    if (error) throw error

    // Load messages for each conversation
    const conversationsWithMessages = await Promise.all(
      (data || []).map(async (conv) => {
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("sequence_order", { ascending: true })

        if (messagesError) throw messagesError

        return {
          ...mapConversationFromDB(conv),
          messages: (messagesData || []).map(mapMessageFromDB),
        }
      })
    )

    return conversationsWithMessages
  } catch (error) {
    console.error("[Supabase] Error fetching conversations:", error)
    throw new Error(`Failed to fetch conversations: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Fetch a single conversation by ID with all messages
 */
export async function fetchConversation(id: string): Promise<ChatConversation> {
  try {
    const { data: convData, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single()

    if (convError) throw convError
    if (!convData) throw new Error("Conversation not found")

    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("sequence_order", { ascending: true })

    if (messagesError) throw messagesError

    return {
      ...mapConversationFromDB(convData),
      messages: (messagesData || []).map(mapMessageFromDB),
    }
  } catch (error) {
    console.error("[Supabase] Error fetching conversation:", error)
    throw new Error(`Failed to fetch conversation: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(
  conversation: Omit<ChatConversation, "id" | "createdAt" | "updatedAt">
): Promise<ChatConversation> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("User not authenticated");

    const { data: convData, error: convError } = await supabase
      .from("conversations")
      .insert({
        title: conversation.title,
        preview: conversation.preview,
        user_id: user.id,
      })
      .select()
      .single()

    if (convError) throw convError
    if (!convData) throw new Error("Failed to create conversation")

    // Insert messages if provided
    if (conversation.messages && conversation.messages.length > 0) {
      const messagesToInsert = conversation.messages.map((msg, index) => ({
        conversation_id: convData.id,
        role: msg.role,
        content: msg.content,
        sequence_order: index,
        timestamp: msg.timestamp || new Date().toISOString(),
      }))

      const { error: messagesError } = await supabase.from("messages").insert(messagesToInsert)

      if (messagesError) throw messagesError
    }

    return {
      ...mapConversationFromDB(convData),
      messages: conversation.messages || [],
    }
  } catch (error: any) {
    console.error("[Supabase] Error creating conversation:", error)
    
    // Provide more detailed error information
    const errorMessage = error?.message || error?.error_description || "Unknown error"
    const errorCode = error?.code || error?.error_code || "unknown"
    
    // Log full error for debugging
    console.error("[Supabase] Full error details:", {
      message: errorMessage,
      code: errorCode,
      details: error,
    })
    
    throw new Error(
      `Failed to create conversation: ${errorMessage} (Code: ${errorCode})`
    )
  }
}

/**
 * Update an existing conversation
 */
export async function updateConversation(
  id: string,
  updates: Partial<ChatConversation>
): Promise<ChatConversation> {
  try {
    const updateData: any = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.preview !== undefined) updateData.preview = updates.preview
    if (updates.userId !== undefined) updateData.user_id = updates.userId

    const { data, error } = await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error("Conversation not found")

    // Reload with messages
    return await fetchConversation(id)
  } catch (error) {
    console.error("[Supabase] Error updating conversation:", error)
    throw new Error(`Failed to update conversation: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Add messages to a conversation
 * Only inserts messages that don't already exist (by content + role check)
 */
export async function addMessagesToConversation(
  conversationId: string,
  messages: ChatMessage[]
): Promise<ChatConversation> {
  try {
    // Get existing messages to check for duplicates
    const { data: existingMessages, error: existingError } = await supabase
      .from("messages")
      .select("id, role, content, sequence_order")
      .eq("conversation_id", conversationId)
      .order("sequence_order", { ascending: false })

    if (existingError) throw existingError

    // Filter out messages that already exist (by content + role)
    const existingContentSet = new Set(
      (existingMessages || []).map((m) => `${m.role}:${m.content.slice(0, 100)}`)
    )

    const newMessages = messages.filter(
      (msg) => !existingContentSet.has(`${msg.role}:${msg.content.slice(0, 100)}`)
    )

    // If no new messages, just return the conversation
    if (newMessages.length === 0) {
      return await fetchConversation(conversationId)
    }

    // Get current max sequence_order
    const maxSequence = existingMessages && existingMessages.length > 0
      ? existingMessages[0].sequence_order
      : -1

    const startSequence = maxSequence + 1

    // Insert only new messages
    const messagesToInsert = newMessages.map((msg, index) => ({
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      sequence_order: startSequence + index,
      timestamp: msg.timestamp || new Date().toISOString(),
    }))

    const { error: insertError } = await supabase.from("messages").insert(messagesToInsert)

    if (insertError) throw insertError

    // Update conversation preview and updated_at with the first new message
    const firstNewMessage = newMessages[0]
    if (firstNewMessage) {
      await supabase
        .from("conversations")
        .update({
          preview: firstNewMessage.content.slice(0, 100),
        })
        .eq("id", conversationId)
    }

    // Reload conversation with all messages
    return await fetchConversation(conversationId)
  } catch (error) {
    console.error("[Supabase] Error adding messages:", error)
    throw new Error(`Failed to add messages: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Delete a conversation (cascade will delete messages)
 */
export async function deleteConversation(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("conversations").delete().eq("id", id)

    if (error) throw error
  } catch (error) {
    console.error("[Supabase] Error deleting conversation:", error)
    throw new Error(`Failed to delete conversation: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

