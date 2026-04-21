/**
 * API Route for OpenAI Workflow using Agents SDK
 * Uses @openai/agents SDK to run workflows with conversation context
 */

import { NextRequest, NextResponse } from "next/server"
import { runRagFirstThenGeneralChat } from "@/lib/ai-chat/workflow-runner"
import { fetchConversation } from "@/lib/ai-chat/services/conversations-api"

/** Segment config must be static; runtime can use ASSISTANT_MAX_DURATION / Vercel. */
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    const { message, threadId, conversationId } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      )
    }

    // Load conversation history if we have a conversation ID
    let conversationHistory: any[] = []
    if (conversationId && !conversationId.startsWith("temp-")) {
      try {
        const conversation = await fetchConversation(conversationId)
        if (conversation && conversation.messages) {
          // Convert to ChatMessage format (excluding the last message if it's the same)
          conversationHistory = conversation.messages.slice(0, -1) // Exclude last message to avoid duplicates
        }
      } catch (error) {
        // Continue without history if loading fails
      }
    }

    // RAG (file_search) primero; si no alcanza, asesor normativo con generateText (temp. 0)
    const { text: responseText, source: answerSource } = await runRagFirstThenGeneralChat(
      message,
      conversationHistory,
    )

    return NextResponse.json({
      message: responseText,
      /** "documents" = respuesta anclada al repositorio indexado; "general" = modo normativo sin RAG suficiente */
      answerSource,
      threadId: conversationId || threadId,
      conversationId,
    })
  } catch (error: any) {
    // Handle specific OpenAI errors
    if (error?.status === 401 || error?.message?.includes("API key")) {
      return NextResponse.json(
        {
          error: "Invalid OpenAI API key",
          code: "invalid_api_key",
        },
        { status: 401 }
      )
    }

    if (error?.status === 402 || error?.message?.includes("quota")) {
      return NextResponse.json(
        {
          error: "OpenAI quota exceeded. Please check your billing.",
          code: "insufficient_quota",
        },
        { status: 402 }
      )
    }

    return NextResponse.json(
      {
        error: "Failed to process assistant request",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}
