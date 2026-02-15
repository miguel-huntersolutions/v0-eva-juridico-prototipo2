/**
 * AI Chat Integration Library
 * Reusable logic for AI chat functionality across projects
 * 
 * This library provides pure logic - no UI components.
 * Use the hooks and helpers to build your own UI.
 * 
 * @example
 * ```tsx
 * import { useAIChat, createChatRoute } from '@/lib/ai-chat'
 * 
 * // In your API route
 * export const POST = createChatRoute({
 *   systemPrompt: 'You are a helpful assistant',
 *   model: getOpenAIChatModelString()  // or OPENAI_MODEL env
 * })
 * 
 * // In your component
 * const { messages, sendMessage, isLoading } = useAIChat({
 *   apiEndpoint: '/api/chat'
 * })
 * ```
 */

export * from "./types"
export * from "./use-ai-chat"
export * from "./use-assistant-chat"
export * from "./use-conversations"
export * from "./create-chat-api-route"
export * from "./improve-text"
export {
  convertToChatMessage,
  convertToAIMessages,
  getMessageText,
  createConversation,
  updateConversation,
  filterConversations,
  groupConversationsByDate,
} from "./helpers"
export * from "./services/conversations-api"

// Re-export Supabase client for convenience
export { createClient as supabase } from "@/lib/supabase/client"

