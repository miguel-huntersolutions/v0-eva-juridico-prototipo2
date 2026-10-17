/**
 * POST /api/smart-fill-fields
 * Autocompletado inteligente de etiquetas antes del formulario de generación (SPEC-004).
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getProcess } from "@/lib/supabase/data-access"
import { runSmartFill } from "@/lib/smart-fill/runner"
import { SmartFillRequestSchema } from "@/lib/smart-fill/types"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 503 },
      )
    }

    const body = await req.json()
    const parsed = SmartFillRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { userContext, tags, context } = parsed.data

    const processRecord = await getProcess(context.processId)
    if (!processRecord) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    if (processRecord.entity_id !== context.entityId) {
      return NextResponse.json({ error: "Entity mismatch" }, { status: 400 })
    }

    const enrichedContext = {
      ...context,
      processObject: context.processObject ?? processRecord.object ?? "",
      processDescription: context.processDescription ?? processRecord.description ?? "",
    }

    const result = await runSmartFill(userContext, tags, enrichedContext)

    return NextResponse.json(result)
  } catch (err) {
    console.error("[smart-fill-fields] Error:", err)
    const message = err instanceof Error ? err.message : "Error en autocompletado"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
