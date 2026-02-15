/**
 * Factory function to create AI chat API routes
 * Reusable across projects
 */

import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { openai } from "@ai-sdk/openai"
import { getOpenAIChatModelString, getOpenAIModel } from "@/lib/ai-model-config"
import type { AIChatConfig } from "./types"

export interface CreateChatRouteOptions {
  /** System prompt for the AI */
  systemPrompt: string
  /** AI model to use (default from OPENAI_MODEL env, e.g. openai/gpt-4o) */
  model?: string
  /** Maximum duration in seconds (default: 30) */
  maxDuration?: number
  /** Additional configuration */
  config?: AIChatConfig
}

/**
 * Creates a Next.js API route handler for AI chat
 * 
 * @example
 * ```ts
 * // app/api/chat/route.ts
 * import { createChatRoute } from '@/lib/ai-chat'
 * 
 * export const POST = createChatRoute({
 *   systemPrompt: 'You are a helpful assistant',
 *   model: getOpenAIChatModelString()  // or from OPENAI_MODEL env
 * })
 * ```
 */
export function createChatRoute(options: CreateChatRouteOptions) {
  const {
    systemPrompt,
    model = getOpenAIChatModelString(),
    maxDuration = 30,
  } = options

  return async function POST(req: Request) {
    try {
      const { messages }: { messages: UIMessage[] } = await req.json()

      // Use OpenAI provider directly
      // Map model string to OpenAI model
      let openaiModel
      if (model?.startsWith("openai/")) {
        const modelName = model.replace("openai/", "")
        openaiModel = openai(modelName as any)
      } else {
        openaiModel = openai(getOpenAIModel() as "gpt-4o")
      }

      const result = streamText({
        model: openaiModel,
        system: systemPrompt,
        messages: convertToModelMessages(messages),
      })

      return result.toUIMessageStreamResponse()
    } catch (error: any) {
      
      // Handle specific OpenAI errors
      if (error?.error?.type === "insufficient_quota") {
        return new Response(
          JSON.stringify({ 
            error: "OpenAI quota exceeded. Please check your billing and add credits to your OpenAI account.",
            code: "insufficient_quota",
            details: error.error.message
          }),
          {
            status: 402, // Payment Required
            headers: { "Content-Type": "application/json" },
          }
        )
      }
      
      // Handle authentication errors
      if (error?.error?.type === "invalid_api_key" || error?.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.",
            code: "invalid_api_key"
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        )
      }
      
      // Generic error
      return new Response(
        JSON.stringify({ 
          error: "Failed to process chat request",
          message: error?.message || error?.error?.message || "Unknown error"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }
  }
}

/**
 * Export maxDuration for Next.js config
 */
export function getMaxDuration(maxDuration: number = 30) {
  return maxDuration
}

