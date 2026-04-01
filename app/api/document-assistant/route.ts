/**
 * POST /api/document-assistant
 * Conversational document generation (RFC-002 / SPEC-002).
 * Request: message, sessionId, context (processId, entityId, secretaryName, templateIds, ...).
 * Response: message, documentState?, intent?, triggerGeneration?, nextDocumentIndex?, sessionId.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getTemplateById } from "@/lib/supabase/data-access"
import {
  DocumentAssistantRequestSchema,
  type DocumentAssistantResponse,
} from "@/lib/document-assistant/types"
import { getSession, upsertSession } from "@/lib/document-assistant/session-store"
import {
  interpretIntentWithAI,
  interpretProcessWithAI,
  parseVariableAssignmentsWithAI,
  improveTextWithAI,
  type AssistantAction,
} from "@/lib/document-assistant/interpret-intent"
import {
  detectIntent,
  parseOnDemandQuery,
  ragProactive,
  ragOnDemand,
  buildInitialMessage,
  buildRagProactiveFallbackMessage,
  buildConfirmGenerateMessage,
  mergeRagIntoState,
  buildChatContextBlock,
  USER_RAG_CONTEXT_KEY,
} from "@/lib/document-assistant/orchestrator"
import { DYNAMIC_TABLE_PREFIX } from "@/lib/utils/template-helpers"

export const maxDuration = 60

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse("Unauthorized", "unauthorized", 401)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse("Invalid JSON body", "invalid_body", 400)
    }

    const parsed = DocumentAssistantRequestSchema.safeParse(body)
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors
      const msg = Object.keys(first).length
        ? `${Object.entries(first).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("; ")}`
        : "Validation failed"
      return errorResponse(msg, "validation_error", 400)
    }

    const { message, sessionId, context, hintIntent, conversationHistory, ragContext: requestRagContext } = parsed.data

    // Load or create session
    let session = await getSession(supabase, sessionId, user.id)
    const sessionJustCreated = !session
    if (!session) {
      session = {
        sessionId,
        userId: user.id,
        context,
        documentState: {},
        currentDocumentIndex: 0,
        templateIds: context.templateIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await upsertSession(supabase, {
        sessionId: session.sessionId,
        userId: session.userId,
        context: session.context,
        documentState: session.documentState,
        currentDocumentIndex: session.currentDocumentIndex,
        templateIds: session.templateIds,
      })
    }

    const idx = session.currentDocumentIndex
    const templateIds = session.templateIds
    if (idx >= templateIds.length) {
      const response: DocumentAssistantResponse = {
        message: "Ya se generaron todos los documentos de este proceso. No hay más plantillas pendientes.",
        sessionId,
      }
      return NextResponse.json(response)
    }

    const templateId = templateIds[idx]
    let template: Awaited<ReturnType<typeof getTemplateById>>
    try {
      template = await getTemplateById(templateId)
    } catch {
      return errorResponse("Plantilla no encontrada", "template_not_found", 404)
    }

    const tags =
      template.variables && Array.isArray(template.variables)
        ? template.variables.filter((v) => typeof v === "string" && !v.startsWith(DYNAMIC_TABLE_PREFIX))
        : []

    // Log contexto usado para consultas (entidad, secretaría, tipo de proceso)
    const queryContext = {
      processCode: context.processCode,
      entityId: context.entityId,
      entityName: context.entityName,
      secretaryId: context.secretaryId,
      secretaryName: context.secretaryName,
      processTypeId: context.processTypeId,
      processTypeName: context.processTypeName ?? null,
    }

    const useHint = hintIntent && ["rag_proactive", "rag_ondemand", "confirm_generate"].includes(hintIntent)
    let intent: "rag_proactive" | "rag_ondemand" | "confirm_generate" | "none"
    let onDemandFromAI: { documentName: string; tag?: string } | null = null

    if (useHint) {
      intent = hintIntent as "rag_proactive" | "rag_ondemand" | "confirm_generate"
      if (intent === "rag_ondemand") onDemandFromAI = parseOnDemandQuery(message) ?? null
    } else {
      const aiIntent = await interpretIntentWithAI(message)
      intent =
        aiIntent?.intent === "rag_proactive"
          ? "rag_proactive"
          : aiIntent?.intent === "confirm_generate"
            ? "confirm_generate"
            : aiIntent?.intent === "rag_ondemand"
              ? "rag_ondemand"
              : detectIntent(message)
      onDemandFromAI =
        aiIntent?.intent === "rag_ondemand" && "documentName" in aiIntent && aiIntent.documentName
          ? { documentName: aiIntent.documentName, tag: aiIntent.tag }
          : parseOnDemandQuery(message) ?? null
    }

    // First request in this session: always show initial message with context (document name + tags)
    if (sessionJustCreated) {
      const contextBlock = buildChatContextBlock(
        {
          processCode: context.processCode,
          entityName: context.entityName,
          secretaryName: context.secretaryName,
          processTypeName: context.processTypeName ?? undefined,
        },
        session.documentState,
      )
      const response: DocumentAssistantResponse = {
        message: contextBlock + buildInitialMessage(template.name, tags, idx, templateIds.length),
        documentState: session.documentState,
        sessionId,
      }
      return NextResponse.json(response)
    }

    let newState = { ...session.documentState }
    if (requestRagContext != null && requestRagContext.trim()) {
      newState[USER_RAG_CONTEXT_KEY] = requestRagContext.trim()
    }
    let replyMessage: string = ""

    // When no button hint: let the AI interpret the process with full context (entidad, secretaría, tipo, chat).
    const useAIActions = !useHint && tags.length > 0
    const processContextForInterpreter = {
      processCode: context.processCode,
      entityName: context.entityName,
      secretaryName: context.secretaryName,
      processTypeName: context.processTypeName ?? undefined,
      templateName: template.name,
    }
    const actions: AssistantAction[] | null = useAIActions
      ? await interpretProcessWithAI(
          message,
          tags,
          session.documentState,
          processContextForInterpreter,
          conversationHistory ?? null,
        )
      : null

    if (actions && actions.length > 0) {
      for (const act of actions) {
        if (act.action === "set_variable") {
          if (act.value) newState[act.tag] = act.value
        } else if (act.action === "improve_variable" && newState[act.tag]) {
          const improved = await improveTextWithAI(newState[act.tag])
          if (improved) newState[act.tag] = improved
        } else if (act.action === "show_variables") {
          const parts = Object.entries(newState).filter(([, v]) => v != null && String(v).trim() !== "")
          replyMessage =
            parts.length > 0
              ? `Variables actuales: ${parts.map(([k, v]) => `${k}=${v}`).join(". ")}. ¿Algo más o **genera** el documento?`
              : "Aún no hay variables con valor. Indique valores, pida **busque los demás** o **genera** cuando quiera."
        } else if (act.action === "set_rag_context") {
          newState[USER_RAG_CONTEXT_KEY] = act.value
          replyMessage = `Contexto guardado: **${act.value}**. ¿Quiere que **busque los demás** datos o indicar valores?`
        } else if (act.action === "rag_proactive") {
          const ragContext = {
            entityId: context.entityId,
            entityName: context.entityName,
            secretaryId: context.secretaryId,
            secretaryName: context.secretaryName,
            processTypeId: context.processTypeId,
            processTypeName: context.processTypeName ?? undefined,
          }
          const userRagContext = newState[USER_RAG_CONTEXT_KEY] ?? null
          const ragResult = await ragProactive(ragContext, tags, userRagContext)
          newState = mergeRagIntoState(newState, ragResult)
          replyMessage =
            Object.keys(ragResult).length > 0
              ? `Encontré: ${Object.entries(ragResult).map(([k, v]) => `${k}=${v}`).join(", ")}. ¿Algo más o genera el documento?`
              : buildRagProactiveFallbackMessage()
        } else if (act.action === "rag_ondemand") {
          const ragResult = await ragOnDemand(act.documentName, act.tag)
          newState = mergeRagIntoState(newState, ragResult)
          replyMessage =
            Object.keys(ragResult).length > 0
              ? `Encontré: ${Object.entries(ragResult).map(([k, v]) => `${k}=${v}`).join(", ")}. ¿Algo más o genera el documento?`
              : "No encontré ese documento o no pude extraer los valores. Indique el valor manualmente o diga **genera**."
        } else if (act.action === "confirm_generate") {
          replyMessage = buildConfirmGenerateMessage(template.name)
          const stateForReplacements = { ...newState }
          delete stateForReplacements[USER_RAG_CONTEXT_KEY]
          const replacements: Record<string, string> = {
            ...stateForReplacements,
            ENTIDAD_NOMBRE: context.entityName,
            SECRETARIA: context.secretaryName,
          }
          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || req.nextUrl.origin
          const generateUrl = `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api/generate-document`
          const cookieHeader = req.headers.get("cookie") || ""
          let generationSuccess = false
          let generationError: string | undefined
          let genJson: { success?: boolean; error?: string; webViewLink?: string } = {}
          try {
            const genRes = await fetch(generateUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", Cookie: cookieHeader },
              body: JSON.stringify({
                templatePath: template.file_url,
                replacements,
                processCode: context.processCode,
                processId: context.processId,
                documentName: template.name,
                entityName: context.entityName,
                entityId: context.entityId,
                secretaryName: context.secretaryName,
                createdBy: user.id,
              }),
            })
            genJson = await genRes.json()
            generationSuccess = genRes.ok && genJson.success === true
            if (!genRes.ok) generationError = genJson.error || genRes.statusText
          } catch (e) {
            generationError = e instanceof Error ? e.message : "Error de red"
          }
          const nextIndex = idx + 1
          await upsertSession(supabase, {
            sessionId,
            userId: user.id,
            context: session.context,
            documentState: {},
            currentDocumentIndex: nextIndex,
            templateIds: session.templateIds,
          })
          const response: DocumentAssistantResponse = {
            message: generationSuccess
              ? `Documento **${template.name}** generado correctamente.${nextIndex < templateIds.length ? " Pasamos al siguiente documento." : " No hay más documentos."}`
              : `No se pudo generar el documento: ${generationError || "Error desconocido"}.`,
            documentState: {},
            intent: "confirm_generate",
            triggerGeneration: true,
            nextDocumentIndex: nextIndex,
            sessionId,
            generationResult: {
              success: generationSuccess,
              documentName: template.name,
              error: generationError,
              driveUrl: generationSuccess ? genJson?.webViewLink : undefined,
            },
          }
          return NextResponse.json(response)
        } else if (act.action === "reply") {
          replyMessage = act.message
        } else if (act.action === "none") {
          replyMessage =
            "Puede indicar valores (ej: «en DETALLE pon: compra de equipos»), pedir **mejora la descripción**, **muéstrame las variables**, **busque los demás** o **genera**."
        }
      }
      // If no reply was set by any action (e.g. only set_variable), use a short confirmation
      if (!replyMessage) {
        const saved = Object.entries(newState).filter(([, v]) => v != null && String(v).trim() !== "")
        replyMessage =
          saved.length > 0
            ? `Guardado. ¿Algo más, **muéstrame las variables**, **busque los demás** o **genera**?`
            : "Puede indicar valores, **busque los demás** o **genera** cuando quiera."
      }
    } else {
      // Fallback: predefined intents + variable assignments
      const assignmentsResult = await parseVariableAssignmentsWithAI(message, tags)
      if (assignmentsResult?.assignments && Object.keys(assignmentsResult.assignments).length > 0) {
        for (const [tag, value] of Object.entries(assignmentsResult.assignments)) {
          if (value != null && String(value).trim() !== "") newState[tag] = String(value).trim()
        }
      }
      if (assignmentsResult?.improveWithAI && newState[assignmentsResult.improveWithAI]) {
        const improved = await improveTextWithAI(newState[assignmentsResult.improveWithAI])
        if (improved) newState[assignmentsResult.improveWithAI] = improved
      }

      switch (intent) {
      case "rag_proactive": {
        const ragContext = {
          entityId: context.entityId,
          entityName: context.entityName,
          secretaryId: context.secretaryId,
          secretaryName: context.secretaryName,
          processTypeId: context.processTypeId,
          processTypeName: context.processTypeName ?? undefined,
        }
        const userRagContextFallback = newState[USER_RAG_CONTEXT_KEY] ?? null
        const ragResult = await ragProactive(ragContext, tags, userRagContextFallback)
        newState = mergeRagIntoState(newState, ragResult)
        replyMessage =
          Object.keys(ragResult).length > 0
            ? `Encontré: ${Object.entries(ragResult).map(([k, v]) => `${k}=${v}`).join(", ")}. ¿Algo más o genera el documento?`
            : buildRagProactiveFallbackMessage()
        break
      }
      case "rag_ondemand": {
        const onDemandQuery = onDemandFromAI ?? parseOnDemandQuery(message)
        if (onDemandQuery?.documentName) {
          const ragResult = await ragOnDemand(onDemandQuery.documentName, onDemandQuery.tag)
          newState = mergeRagIntoState(newState, ragResult)
          replyMessage =
            Object.keys(ragResult).length > 0
              ? `Encontré: ${Object.entries(ragResult).map(([k, v]) => `${k}=${v}`).join(", ")}. ¿Algo más o genera el documento?`
              : "No encontré ese documento o no pude extraer los valores. Indique el valor manualmente o diga **genera con IA**."
        } else {
          replyMessage =
            "Indique en qué documento buscar, por ejemplo: «busca en Estudios Previos» o «busca NIT en Minuta»."
        }
        break
      }
      case "confirm_generate": {
        replyMessage = buildConfirmGenerateMessage(template.name)
        const stateForReplacementsFallback = { ...newState }
        delete stateForReplacementsFallback[USER_RAG_CONTEXT_KEY]
        const replacements: Record<string, string> = {
          ...stateForReplacementsFallback,
          ENTIDAD_NOMBRE: context.entityName,
          SECRETARIA: context.secretaryName,
        }
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.VERCEL_URL ||
          req.nextUrl.origin
        const generateUrl = `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api/generate-document`
        const cookieHeader = req.headers.get("cookie") || ""
        let generationSuccess = false
        let generationError: string | undefined
        let genJson: { success?: boolean; error?: string; webViewLink?: string } = {}
        try {
          const genRes = await fetch(generateUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: cookieHeader },
            body: JSON.stringify({
              templatePath: template.file_url,
              replacements,
              processCode: context.processCode,
              processId: context.processId,
              documentName: template.name,
              entityName: context.entityName,
              entityId: context.entityId,
              secretaryName: context.secretaryName,
              createdBy: user.id,
            }),
          })
          genJson = await genRes.json()
          generationSuccess = genRes.ok && genJson.success === true
          if (!genRes.ok) generationError = genJson.error || genRes.statusText
        } catch (e) {
          generationError = e instanceof Error ? e.message : "Error de red"
        }
        const nextIndex = idx + 1
        await upsertSession(supabase, {
          sessionId,
          userId: user.id,
          context: session.context,
          documentState: {},
          currentDocumentIndex: nextIndex,
          templateIds: session.templateIds,
        })
        const response: DocumentAssistantResponse = {
          message: generationSuccess
            ? `Documento **${template.name}** generado correctamente.${nextIndex < templateIds.length ? " Pasamos al siguiente documento." : " No hay más documentos."}`
            : `No se pudo generar el documento: ${generationError || "Error desconocido"}.`,
          documentState: {},
          intent: "confirm_generate",
          triggerGeneration: true,
          nextDocumentIndex: nextIndex,
          sessionId,
          generationResult: {
            success: generationSuccess,
            documentName: template.name,
            error: generationError,
            driveUrl: generationSuccess ? genJson?.webViewLink : undefined,
          },
        }
        return NextResponse.json(response)
      }
      default: {
        const saved = assignmentsResult?.assignments && Object.keys(assignmentsResult.assignments).length > 0
        if (saved) {
          const parts = Object.entries(assignmentsResult!.assignments).map(([k, v]) => `${k}=${v}`)
          replyMessage = `Guardé: ${parts.join(", ")}. ¿Algo más, **busque los demás** para completar el resto, o **genera** cuando quiera generar este documento?`
        } else {
          replyMessage =
            "Puede indicar valores (ej: «en DETALLE pon: compra de equipos»), **busque los demás** para que busque datos, o **todo ok** / **genera** cuando quiera generar este documento."
        }
        break
      }
      }
    }

    // Siempre imprimir en el chat el contexto: proceso, entidad, secretaría, tipo y lo obtenido (variables actuales).
    const contextBlock = buildChatContextBlock(
      {
        processCode: context.processCode,
        entityName: context.entityName,
        secretaryName: context.secretaryName,
        processTypeName: context.processTypeName ?? undefined,
      },
      newState,
    )
    const finalMessage = contextBlock + replyMessage

    await upsertSession(supabase, {
      sessionId,
      userId: user.id,
      context: session.context,
      documentState: newState,
      currentDocumentIndex: session.currentDocumentIndex,
      templateIds: session.templateIds,
    })

    const response: DocumentAssistantResponse = {
      message: finalMessage,
      documentState: newState,
      intent: intent !== "none" ? intent : undefined,
      sessionId,
    }
    return NextResponse.json(response)
  } catch (err) {
    return errorResponse(
      "Failed to process document assistant request",
      "document_assistant_error",
      500
    )
  }
}
