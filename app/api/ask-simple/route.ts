/**
 * POST /api/ask-simple
 * Simple question for a form field – no legal/process context.
 * Use for: "convierte 989898 a letras", "formatea esta fecha", etc.
 */

import { askSimple } from "@/lib/ai-chat/ask-simple"
import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, question, fieldLabel, model } = body

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "question is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    const result = await askSimple({
      text: typeof text === "string" ? text : undefined,
      question: question.trim(),
      fieldLabel: typeof fieldLabel === "string" ? fieldLabel : undefined,
      model: typeof model === "string" ? model : undefined,
    })

    return NextResponse.json({ text: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const code = error && typeof (error as any)?.code === "string" ? (error as any).code : "unknown_error"
    const status =
      message.includes("quota") ? 402
      : message.includes("API key") ? 401
      : 500
    console.error("[ask-simple] Error:", error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
