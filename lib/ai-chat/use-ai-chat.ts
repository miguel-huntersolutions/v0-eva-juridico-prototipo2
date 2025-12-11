/**
 * Custom hook for AI Chat integration
 * Reusable across projects
 */

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import type { AIChatConfig, AIChatOptions, ChatMessage, ChatConversation } from "./types"

export interface UseAIChatReturn {
  /** Current messages */
  messages: any[]
  /** Send a message */
  sendMessage: (message: { text: string }) => void
  /** Current status */
  status: string
  /** Error if any */
  error: Error | null | undefined
  /** Set messages manually */
  setMessages: (messages: any[]) => void
  /** Stop current generation */
  stop: () => void
  /** Reload last message (if available) */
  reload?: () => void
  /** Loading state */
  isLoading: boolean
  /** Get message text helper */
  getMessageText: (message: any) => string
}

/**
 * Custom hook for AI chat functionality
 * 
 * @example
 * ```tsx
 * const { messages, sendMessage, isLoading } = useAIChat({
 *   apiEndpoint: '/api/chat',
 *   systemPrompt: 'You are a helpful assistant',
 *   model: 'openai/gpt-4o'
 * })
 * ```
 */
export function useAIChat(
  config: AIChatConfig = {},
  options: AIChatOptions = {}
): UseAIChatReturn {
  const {
    apiEndpoint = "/api/chat",
    systemPrompt,
    model,
    maxDuration,
    headers,
  } = config

  const chat = useChat({
    transport: new DefaultChatTransport({
      api: apiEndpoint,
      headers,
    }),
    onError: (error) => {
      console.error("[AI Chat] Error:", error)
      options.onError?.(error)
    },
  })

  const { messages, sendMessage, status, error, setMessages, stop } = chat
  const isLoading = status === "submitted" || status === "streaming"

  // Helper to extract text from message
  const getMessageText = React.useCallback((message: any) => {
    return message.parts
      ?.filter((part: any): part is { type: "text"; text: string } => part.type === "text")
      ?.map((part: any) => part.text)
      ?.join("") || ""
  }, [])

  // Callbacks for message events
  React.useEffect(() => {
    if (options.onResponseReceived && messages.length > 0 && !isLoading) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant") {
        const messageText = getMessageText(lastMessage)
        options.onResponseReceived({
          id: lastMessage.id,
          role: "assistant",
          content: messageText,
          timestamp: new Date().toISOString(),
        })
      }
    }
  }, [messages, isLoading, options, getMessageText])

  return {
    messages,
    sendMessage,
    status,
    error: error || null,
    setMessages,
    stop,
    reload: (chat as any).reload,
    isLoading,
    getMessageText,
  }
}

