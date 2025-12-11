/**
 * Helper functions for AI Chat
 * Pure logic, no UI components
 */

import type { ChatMessage, ChatConversation } from "./types"

/**
 * Convert AI SDK message format to ChatMessage
 */
export function convertToChatMessage(message: any): ChatMessage {
  const content = message.parts
    ?.filter((part: any): part is { type: "text"; text: string } => part.type === "text")
    ?.map((part: any) => part.text)
    ?.join("") || ""

  return {
    id: message.id,
    role: message.role as "user" | "assistant",
    content,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Convert ChatMessage array to AI SDK format
 */
export function convertToAIMessages(messages: ChatMessage[]): any[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  }))
}

/**
 * Extract text content from AI SDK message
 */
export function getMessageText(message: any): string {
  return message.parts
    ?.filter((part: any): part is { type: "text"; text: string } => part.type === "text")
    ?.map((part: any) => part.text)
    ?.join("") || ""
}

/**
 * Create a new conversation from initial message
 */
export function createConversation(
  firstMessage: string,
  userId?: string
): ChatConversation {
  return {
    id: `conv-${Date.now()}`,
    title: firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : ""),
    preview: firstMessage,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId,
  }
}

/**
 * Update conversation with new messages
 */
export function updateConversation(
  conversation: ChatConversation,
  messages: ChatMessage[]
): ChatConversation {
  return {
    ...conversation,
    messages,
    preview: messages[0]?.content.slice(0, 100) || conversation.preview,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Filter conversations by search query
 */
export function filterConversations(
  conversations: ChatConversation[],
  query: string
): ChatConversation[] {
  if (!query.trim()) return conversations

  const lowerQuery = query.toLowerCase()
  return conversations.filter(
    (conv) =>
      conv.title.toLowerCase().includes(lowerQuery) ||
      conv.preview.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Group conversations by date
 */
export function groupConversationsByDate(
  conversations: ChatConversation[]
): Array<{ label: string; conversations: ChatConversation[] }> {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)

  const groups: { label: string; conversations: ChatConversation[] }[] = [
    { label: "Hoy", conversations: [] },
    { label: "Ayer", conversations: [] },
    { label: "Últimos 7 días", conversations: [] },
    { label: "Anteriores", conversations: [] },
  ]

  conversations.forEach((conv) => {
    const convDate = new Date(conv.updatedAt)
    if (convDate.toDateString() === today.toDateString()) {
      groups[0].conversations.push(conv)
    } else if (convDate.toDateString() === yesterday.toDateString()) {
      groups[1].conversations.push(conv)
    } else if (convDate > lastWeek) {
      groups[2].conversations.push(conv)
    } else {
      groups[3].conversations.push(conv)
    }
  })

  return groups.filter((g) => g.conversations.length > 0)
}

