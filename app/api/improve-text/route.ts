/**
 * API Route for text improvement
 * Uses the ai-chat library's improveText function
 */

import { improveText } from "@/lib/ai-chat/improve-text"
import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      text,
      fieldName,
      fieldLabel,
      fieldHelpText,
      entityName,
      processTypeName,
      processTypeDescription,
      legalBasis,
      secretaryName,
      systemPrompt,
      model,
    } = body

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 }
      )
    }

    const improvedText = await improveText({
      text,
      fieldName,
      fieldLabel,
      fieldHelpText,
      entityName,
      processTypeName,
      processTypeDescription,
      legalBasis,
      secretaryName,
      systemPrompt,
      model,
    })

    return NextResponse.json({ improvedText })
  } catch (error: any) {
    console.error("[Improve Text API] Error:", error)
    
    return NextResponse.json(
      {
        error: error.message || "Failed to improve text",
        code: error.code || "unknown_error",
      },
      { status: error.message?.includes("quota") ? 402 : error.message?.includes("API key") ? 401 : 500 }
    )
  }
}

