/**
 * POST /api/rag/query
 * One-off question over entity documents (file search). E.g. "nombre del alcalde de Pensilvania", "cédula".
 * Requires OPENAI_ASSISTANT_WORKFLOW_ID. Returns plain text answer.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { runWorkflow } from "@/lib/ai-chat/workflow-runner"

export const maxDuration = 45

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("RAG query timeout")), ms)),
  ])
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.OPENAI_ASSISTANT_WORKFLOW_ID) {
      return NextResponse.json(
        { error: "Consulta en documentos no está configurada (OPENAI_ASSISTANT_WORKFLOW_ID)" },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { question, entityId, entityName } = body

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 })
    }

    const contextParts: string[] = []
    if (entityName) contextParts.push(`Entidad: ${entityName}`)
    if (entityId) contextParts.push(`(ID entidad: ${entityId})`)

    const prompt = `Usa la búsqueda en documentos (file search) para responder esta pregunta con datos de los documentos de la entidad.
${contextParts.length ? `Contexto: ${contextParts.join(" ")}\n\n` : ""}
Pregunta del usuario: ${question.trim()}

Responde en una o dos líneas, solo con el dato solicitado. Si no encuentras el dato en los documentos, responde: "No encontrado en los documentos."`

    const raw = await withTimeout(
      runWorkflow(prompt, [], { skipGuardrails: true }),
      40_000
    )

    const text = typeof raw === "string" ? raw.trim() : ""
    return NextResponse.json({ text: text || "No encontrado en los documentos." })
  } catch (err) {
    console.error("[rag/query] Error:", err)
    const message = err instanceof Error ? err.message : "Error en la consulta"
    return NextResponse.json(
      { error: message },
      { status: message.includes("timeout") ? 504 : 500 }
    )
  }
}
