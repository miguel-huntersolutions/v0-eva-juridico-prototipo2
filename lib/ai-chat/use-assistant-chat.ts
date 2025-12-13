/**
 * Custom hook for OpenAI Assistant Chat with Workflow
 * Uses OpenAI Assistant API with thread management for conversation context
 */

import * as React from "react"
import type { ChatMessage } from "./types"

export interface UseAssistantChatReturn {
  /** Current messages */
  messages: ChatMessage[]
  /** Send a message */
  sendMessage: (message: { text: string }) => Promise<void>
  /** Current status */
  status: "idle" | "loading" | "error"
  /** Error if any */
  error: Error | null
  /** Set messages manually */
  setMessages: (messages: ChatMessage[]) => void
  /** Loading state */
  isLoading: boolean
  /** Current thread ID */
  threadId: string | null
  /** Set thread ID */
  setThreadId: (threadId: string | null) => void
  /** Current conversation ID */
  conversationId: string | null
  /** Set conversation ID */
  setConversationId: (conversationId: string | null) => void
}

export interface UseAssistantChatOptions {
  /** API endpoint for assistant requests */
  apiEndpoint?: string
  /** Callback when response is received - receives both user and assistant messages */
  onResponseReceived?: (userMessage: ChatMessage, assistantMessage: ChatMessage) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Initial thread ID */
  initialThreadId?: string | null
  /** Initial conversation ID */
  initialConversationId?: string | null
}

/**
 * Custom hook for OpenAI Assistant chat functionality
 */
export function useAssistantChat(
  options: UseAssistantChatOptions = {}
): UseAssistantChatReturn {
  const {
    apiEndpoint = "/api/assistant",
    onResponseReceived,
    onError,
    initialThreadId = null,
    initialConversationId = null,
  } = options

  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle")
  const [error, setError] = React.useState<Error | null>(null)
  const [threadId, setThreadId] = React.useState<string | null>(initialThreadId)
  const [conversationId, setConversationId] = React.useState<string | null>(initialConversationId)

  const isLoading = status === "loading"

  const sendMessage = React.useCallback(
    async (message: { text: string }) => {
      if (!message.text.trim()) return

      setStatus("loading")
      setError(null)

      // Add user message to local state
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: message.text,
        timestamp: new Date().toISOString(),
      }

      // Store user message in a ref so we can access it in the callback
      const currentUserMessage = userMessage
      setMessages((prev) => [...prev, currentUserMessage])

      try {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: message.text,
            threadId: threadId,
            conversationId: conversationId || undefined,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to get assistant response")
        }

        const data = await response.json()

        // Update thread ID if we got a new one
        if (data.threadId && data.threadId !== threadId) {
          setThreadId(data.threadId)
        }

        // Update conversation ID if provided
        if (data.conversationId) {
          setConversationId(data.conversationId)
        }

        // Add assistant response to local state
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: data.message,
          timestamp: new Date().toISOString(),
        }

        setMessages((prev) => {
          const updated = [...prev, assistantMessage]
          // Call callback with both user and assistant messages for saving
          if (onResponseReceived) {
            // Find the last user message that triggered this response (should be the one we just added)
            const lastUserMsg = prev.findLast((m) => m.role === "user") || currentUserMessage
            // Call with both messages
            onResponseReceived(lastUserMsg, assistantMessage)
          }
          return updated
        })
        setStatus("idle")
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error")
        setError(error)
        setStatus("error")
        onError?.(error)
      }
    },
    [apiEndpoint, threadId, conversationId, onResponseReceived, onError]
  )

  return {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
    isLoading,
    threadId,
    setThreadId,
    conversationId,
    setConversationId,
  }
}

