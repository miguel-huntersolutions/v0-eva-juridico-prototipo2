/**
 * API Route for OpenAI Workflow using Agents SDK
 * Uses @openai/agents SDK to run workflows with conversation context
 */

import { NextRequest, NextResponse } from "next/server"
import { runWorkflow } from "@/lib/ai-chat/workflow-runner"
import { fetchConversation } from "@/lib/ai-chat/services/conversations-api"

/** Segment config must be static; runtime can use ASSISTANT_MAX_DURATION / Vercel. */
export const maxDuration = 60

// Get workflow ID from environment variable
const WORKFLOW_ID = process.env.OPENAI_ASSISTANT_WORKFLOW_ID

export async function POST(req: NextRequest) {
  try {
    if (!WORKFLOW_ID) {
      return NextResponse.json(
        { error: "Assistant workflow not configured" },
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

    // Run the workflow with conversation history
    const responseText = await runWorkflow(message, conversationHistory)

    // Return the response
    // Note: For workflows, we use conversationId as the "thread" identifier
    // since workflows don't use OpenAI threads in the traditional sense
    return NextResponse.json({
      message: responseText,
      threadId: conversationId || threadId, // Use conversationId as thread identifier
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
