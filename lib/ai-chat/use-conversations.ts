/**
 * Custom hook for managing conversations persistence
 * Handles loading, saving, updating, and deleting conversations
 */

import * as React from "react"
import type { ChatConversation, ChatMessage } from "./types"
import {
  fetchConversations,
  fetchConversation,
  createConversation as createConversationAPI,
  updateConversation as updateConversationAPI,
  addMessagesToConversation,
  deleteConversation as deleteConversationAPI,
} from "./services/conversations-api"
import { createConversation, updateConversation } from "./helpers"

export interface UseConversationsOptions {
  /** User ID for filtering conversations */
  userId?: string
  /** Auto-load conversations on mount */
  autoLoad?: boolean
  /** Callback when conversation is created */
  onConversationCreated?: (conversation: ChatConversation) => void
  /** Callback when conversation is updated */
  onConversationUpdated?: (conversation: ChatConversation) => void
  /** Callback when conversation is deleted */
  onConversationDeleted?: (id: string) => void
  /** Callback on error */
  onError?: (error: Error) => void
}

export interface UseConversationsReturn {
  /** List of conversations */
  conversations: ChatConversation[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Load conversations from API */
  loadConversations: () => Promise<void>
  /** Load a single conversation */
  loadConversation: (id: string) => Promise<ChatConversation | null>
  /** Create a new conversation */
  createConversation: (firstMessage: string) => Promise<ChatConversation>
  /** Update conversation */
  updateConversation: (id: string, updates: Partial<ChatConversation>) => Promise<void>
  /** Add messages to conversation */
  addMessages: (id: string, messages: ChatMessage[]) => Promise<void>
  /** Delete conversation */
  deleteConversation: (id: string) => Promise<void>
  /** Refresh conversations list */
  refresh: () => Promise<void>
}

/**
 * Hook for managing conversations with persistence
 * 
 * @example
 * ```tsx
 * const {
 *   conversations,
 *   createConversation,
 *   addMessages,
 *   isLoading
 * } = useConversations({
 *   userId: 'user-123',
 *   autoLoad: true
 * })
 * ```
 */
export function useConversations(
  options: UseConversationsOptions = {}
): UseConversationsReturn {
  const {
    userId,
    autoLoad = false,
    onConversationCreated,
    onConversationUpdated,
    onConversationDeleted,
    onError,
  } = options

  const [conversations, setConversations] = React.useState<ChatConversation[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  // Load conversations from API
  const loadConversations = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchConversations(userId)
      setConversations(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load conversations")
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [userId, onError])

  // Load single conversation
  const loadConversation = React.useCallback(
    async (id: string): Promise<ChatConversation | null> => {
      setIsLoading(true)
      setError(null)
      try {
        const conversation = await fetchConversation(id)
        // Update local state
        setConversations((prev) => {
          const exists = prev.find((c) => c.id === id)
          if (exists) {
            return prev.map((c) => (c.id === id ? conversation : c))
          }
          return [conversation, ...prev]
        })
        return conversation
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to load conversation")
        setError(error)
        onError?.(error)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [onError]
  )

  // Create new conversation
  const createConversationHandler = React.useCallback(
    async (firstMessage: string): Promise<ChatConversation> => {
      setIsLoading(true)
      setError(null)
      try {
        const newConv = createConversation(firstMessage, userId)
        const saved = await createConversationAPI(newConv)
        setConversations((prev) => [saved, ...prev])
        onConversationCreated?.(saved)
        return saved
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to create conversation")
        setError(error)
        onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [userId, onConversationCreated, onError]
  )

  // Update conversation
  const updateConversationHandler = React.useCallback(
    async (id: string, updates: Partial<ChatConversation>): Promise<void> => {
      setError(null)
      try {
        const updated = await updateConversationAPI(id, updates)
        setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)))
        onConversationUpdated?.(updated)
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update conversation")
        setError(error)
        onError?.(error)
        throw error
      }
    },
    [onConversationUpdated, onError]
  )

  // Add messages to conversation
  const addMessages = React.useCallback(
    async (id: string, messages: ChatMessage[]): Promise<void> => {
      setError(null)
      try {
        const updated = await addMessagesToConversation(id, messages)
        setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)))
        onConversationUpdated?.(updated)
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to add messages")
        setError(error)
        onError?.(error)
        throw error
      }
    },
    [onConversationUpdated, onError]
  )

  // Delete conversation
  const deleteConversationHandler = React.useCallback(
    async (id: string): Promise<void> => {
      setError(null)
      try {
        await deleteConversationAPI(id)
        setConversations((prev) => prev.filter((c) => c.id !== id))
        onConversationDeleted?.(id)
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to delete conversation")
        setError(error)
        onError?.(error)
        throw error
      }
    },
    [onConversationDeleted, onError]
  )

  // Refresh conversations
  const refresh = React.useCallback(async () => {
    await loadConversations()
  }, [loadConversations])

  // Auto-load on mount
  React.useEffect(() => {
    if (autoLoad) {
      loadConversations()
    }
  }, [autoLoad, loadConversations])

  return {
    conversations,
    isLoading,
    error,
    loadConversations,
    loadConversation,
    createConversation: createConversationHandler,
    updateConversation: updateConversationHandler,
    addMessages,
    deleteConversation: deleteConversationHandler,
    refresh,
  }
}

