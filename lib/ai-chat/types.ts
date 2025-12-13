/**
 * Types for AI Chat integration
 * Reusable across projects
 */

export interface AIChatConfig {
  /** API endpoint for chat requests */
  apiEndpoint?: string
  /** System prompt for the AI */
  systemPrompt?: string
  /** AI model to use */
  model?: string
  /** Maximum duration for requests */
  maxDuration?: number
  /** Additional headers for API requests */
  headers?: Record<string, string>
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export interface ChatConversation {
  id: string
  title: string
  preview: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  userId?: string
  openaiThreadId?: string
}

export interface AIChatOptions {
  /** Initial messages */
  initialMessages?: ChatMessage[]
  /** Callback when message is sent */
  onMessageSent?: (message: ChatMessage) => void
  /** Callback when response is received */
  onResponseReceived?: (message: ChatMessage) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Enable conversation history persistence */
  enableHistory?: boolean
  /** Custom storage key for history */
  storageKey?: string
}

