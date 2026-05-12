/**
 * Workflow runner for OpenAI Agents SDK
 * This file contains the workflow logic for EVA Jurídico Assistant
 * Generated from OpenAI Agent Builder and adapted for conversation history
 */

import { fileSearchTool, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents"
import { z } from "zod"
import { OpenAI } from "openai"
import { runGuardrails } from "@openai/guardrails"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import type { ChatMessage } from "./types"
import {
  getOpenAIModel,
  getOpenAIWorkflowModel,
  getAsesorJuridicoSystemPrompt,
  getAsesorJuridicoTemperature,
} from "@/lib/ai-model-config"
import {
  ASESOR_JURIDICO_SYSTEM_PROMPT_DEFAULT,
  ASESOR_JURIDICO_TEMPERATURE_DEFAULT,
} from "@/lib/ai-chat/asesor-juridico-system-prompt"

// Workflow and vector store IDs (definir en .env; los valores por defecto son solo para desarrollo)
const WORKFLOW_ID = process.env.OPENAI_ASSISTANT_WORKFLOW_ID || "wf_6925fc6d7280819083832d2195f02fd1020357ea2b80faed"
const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID || "vs_6925fde642a481918a79478672c29e81"

// Shared client for guardrails and file search
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Guardrails definitions (model from env via getOpenAIWorkflowModel)
function getJailbreakGuardrailConfig() {
  return {
    guardrails: [
      { name: "Jailbreak", config: { model: getOpenAIWorkflowModel(), confidence_threshold: 0.7 } },
    ],
  }
}
const context = { guardrailLlm: client }

function guardrailsHasTripwire(results: any[]): boolean {
  return (results ?? []).some((r) => r?.tripwireTriggered === true)
}

function getGuardrailSafeText(results: any[], fallbackText: string): string {
  for (const r of results ?? []) {
    if (r?.info && "checked_text" in r.info) {
      return r.info.checked_text ?? fallbackText
    }
  }
  const pii = (results ?? []).find((r) => r?.info && "anonymized_text" in r.info)
  return pii?.info?.anonymized_text ?? fallbackText
}

async function scrubConversationHistory(history: AgentInputItem[], piiOnly: any): Promise<void> {
  for (const msg of history ?? []) {
    const content = Array.isArray(msg?.content) ? msg.content : []
    for (const part of content) {
      if (part && typeof part === "object" && part.type === "input_text" && typeof part.text === "string") {
        const res = await runGuardrails(part.text, piiOnly, context, true)
        part.text = getGuardrailSafeText(res, part.text)
      }
    }
  }
}

async function scrubWorkflowInput(workflow: any, inputKey: string, piiOnly: any): Promise<void> {
  if (!workflow || typeof workflow !== "object") return
  const value = workflow?.[inputKey]
  if (typeof value !== "string") return
  const res = await runGuardrails(value, piiOnly, context, true)
  workflow[inputKey] = getGuardrailSafeText(res, value)
}

async function runAndApplyGuardrails(inputText: string, config: any, history: AgentInputItem[], workflow: any) {
  const guardrails = Array.isArray(config?.guardrails) ? config.guardrails : []
  const results = await runGuardrails(inputText, config, context, true)
  const shouldMaskPII = guardrails.find(
    (g: any) => g?.name === "Contains PII" && g?.config && g.config.block === false
  )
  if (shouldMaskPII) {
    const piiOnly = { guardrails: [shouldMaskPII] }
    await scrubConversationHistory(history, piiOnly)
    await scrubWorkflowInput(workflow, "input_as_text", piiOnly)
    await scrubWorkflowInput(workflow, "input_text", piiOnly)
  }
  const hasTripwire = guardrailsHasTripwire(results)
  const safeText = getGuardrailSafeText(results, inputText) ?? inputText
  return {
    results,
    hasTripwire,
    safeText,
    failOutput: buildGuardrailFailOutput(results ?? []),
    passOutput: { safe_text: safeText },
  }
}

function buildGuardrailFailOutput(results: any[]) {
  const get = (name: string) =>
    (results ?? []).find((r: any) => (r?.info?.guardrail_name ?? r?.info?.guardrailName) === name)
  const pii = get("Contains PII")
  const mod = get("Moderation")
  const jb = get("Jailbreak")
  const hal = get("Hallucination Detection")
  const nsfw = get("NSFW Text")
  const url = get("URL Filter")
  const custom = get("Custom Prompt Check")
  const pid = get("Prompt Injection Detection")
  const piiCounts = Object.entries(pii?.info?.detected_entities ?? {})
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => k + ":" + (v as any[]).length)
  const conf = jb?.info?.confidence
  return {
    pii: {
      failed: piiCounts.length > 0 || pii?.tripwireTriggered === true,
      detected_counts: piiCounts,
    },
    moderation: {
      failed: mod?.tripwireTriggered === true || ((mod?.info?.flagged_categories ?? []).length > 0),
      flagged_categories: mod?.info?.flagged_categories,
    },
    jailbreak: { failed: jb?.tripwireTriggered === true },
    hallucination: {
      failed: hal?.tripwireTriggered === true,
      reasoning: hal?.info?.reasoning,
      hallucination_type: hal?.info?.hallucination_type,
      hallucinated_statements: hal?.info?.hallucinated_statements,
      verified_statements: hal?.info?.verified_statements,
    },
    nsfw: { failed: nsfw?.tripwireTriggered === true },
    url_filter: { failed: url?.tripwireTriggered === true },
    custom_prompt_check: { failed: custom?.tripwireTriggered === true },
    prompt_injection: { failed: pid?.tripwireTriggered === true },
  }
}

/**
 * Convert ChatMessage array to AgentInputItem array for conversation history
 */
function convertMessagesToAgentInput(messages: ChatMessage[]): AgentInputItem[] {
  return messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "assistant",
    content: [{ type: "input_text" as const, text: msg.content }],
  }))
}

/**
 * Extract text from workflow output
 */
function extractOutputText(output: any): string {
  if (typeof output === "string") {
    return output
  }
  if (output?.output_text) {
    return output.output_text
  }
  if (output?.message) {
    return output.message
  }
  if (output?.safe_text) {
    return output.safe_text
  }
  if (output?.passOutput?.safe_text) {
    return output.passOutput.safe_text
  }
  return JSON.stringify(output)
}

// Tool definitions (add your custom tools here if needed)
// Example tool structure - customize for EVA Jurídico needs
// const searchJurisprudence = tool({
//   name: "searchJurisprudence",
//   description: "Search for relevant jurisprudence and legal precedents",
//   parameters: z.object({
//     query: z.string(),
//     court: z.string().optional(),
//   }),
//   execute: async (input: { query: string; court?: string }) => {
//     // TODO: Implement jurisprudence search
//     return { results: [] }
//   },
// })

const fileSearch = fileSearchTool([VECTOR_STORE_ID])

// Agent definitions
const ClassificationAgentSchema = z.object({
  classification: z.enum(["contract_consultation", "process_guidance", "legal_research", "general_information"]),
})

const classificationAgent = new Agent({
  name: "Classification agent",
  instructions: `Classify the user's intent into one of the following categories: "contract_consultation", "process_guidance", "legal_research", or "general_information".

1. Questions about specific contract processes, requirements, or procedures should route to "process_guidance".
2. Questions about contract terms, clauses, or legal interpretation should route to "contract_consultation".
3. Questions about laws, regulations, jurisprudence, or legal precedents should route to "legal_research".
4. Any other general questions about public contracting should go to "general_information".`,
  model: getOpenAIWorkflowModel(),
  outputType: ClassificationAgentSchema,
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
})

const processGuidanceAgent = new Agent({
  name: "Process Guidance Agent",
  instructions: `You are a specialized agent for guiding users through public contracting processes in Colombia.
  Use file search to base your answers on the documents in the knowledge base (alcaldes, contratos, procesos, plantillas).
  Provide step-by-step guidance on processes like:
  - Licitación pública
  - Selección abreviada
  - Estudios previos
  - Pliegos de condiciones
  - Evaluación de ofertas
  - Adjudicación y celebración de contratos
  
  Always cite the relevant articles from Decreto 1082 de 2015 and other applicable regulations when available in the documents.
  Provide clear, actionable guidance with specific deadlines and requirements.   Prefer information retrieved from the documents over general knowledge.`,
  model: getOpenAIWorkflowModel(),
  tools: [fileSearch],
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
})

const contractConsultationAgent = new Agent({
  name: "Contract Consultation Agent",
  instructions: `You are a specialized agent for contract consultation and interpretation.
  Use file search to base your answers on the documents in the knowledge base (contratos, cláusulas, normativa).
  Help users understand:
  - Contract terms and clauses
  - Legal requirements for contracts
  - Modification procedures (adiciones, prórrogas)
  - Guarantees and warranties
  - Payment and execution terms
  
  Always reference the specific legal framework (Ley 80, Decreto 1082) when available in the documents and provide precise citations. Prefer information retrieved from the documents.`,
  model: getOpenAIWorkflowModel(),
  tools: [fileSearch],
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
})

const legalResearchAgent = new Agent({
  name: "Legal Research Agent",
  instructions: `You are a specialized agent for legal research on public contracting in Colombia.
  Provide information about:
  - Applicable laws and regulations (Ley 80, Ley 1150, Decreto 1082, etc.)
  - Jurisprudence from Consejo de Estado
  - Concepts from Colombia Compra Eficiente
  - Legal precedents and interpretations
  
  Use file search to find relevant documents and always cite your sources accurately.`,
  model: getOpenAIWorkflowModel(),
  tools: [fileSearch],
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
})

const generalInformationAgent = new Agent({
  name: "General Information Agent",
  instructions: `You are EVA, a general information agent for public contracting in Colombia.
  Provide comprehensive information about:
  - Public contracting system in Colombia
  - SECOP I and SECOP II
  - Colombia Compra Eficiente
  - General contracting principles
  - Best practices
  
  Use file search when available to provide accurate, up-to-date information.
  Always respond in Spanish (Colombian) and cite relevant sources.`,
  model: getOpenAIWorkflowModel(),
  tools: [fileSearch],
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
})

/** Paso 1 de /api/assistant: solo RAG; si no basta, el servidor usa generateText con el asesor jurídico. */
const RagFirstResultSchema = z.object({
  sufficient: z.boolean().describe(
    "true solo si la consulta puede responderse con fundamento claro en fragmentos recuperados de los documentos indexados",
  ),
  groundedAnswer: z.string().describe(
    "Respuesta completa en español cuando sufficient es true; si false, cadena vacía",
  ),
})

/** Instrucciones del asesor + tarea estructurada RAG (solo /api/assistant; no afecta runWorkflow de documentos). */
const RAG_PROBE_INSTRUCTIONS_SUFFIX = `

---
TAREA CON HERRAMIENTA file_search (repositorio de documentos indexados en EVA Jurídico):
Tienes obligatoriamente la herramienta file_search sobre el vector store de documentos cargados.

Procedimiento:
1) Usa file_search y busca en los documentos indexados información relevante para la última consulta del usuario. El historial de la conversación sirve solo como contexto.
2) Si encuentras contenido en esos documentos que permita responder con seguridad la consulta, cumpliendo las reglas de rol, alcance, marco normativo, jurisprudencia y estilo indicados arriba, pon sufficient=true y redacta la respuesta completa en groundedAnswer (español colombiano, formal y técnico). Cuando corresponda, indica de qué documento o sección proviene la información (sin inventar nombres de archivo).
3) Si tras usar file_search no hay material suficiente en los documentos indexados para fundamentar la respuesta, pon sufficient=false y groundedAnswer debe ser exactamente una cadena vacía.

No inventes citas a documentos. No pongas sufficient=true sin respaldo recuperable en la búsqueda.`

const ragDocumentProbeAgent = new Agent({
  name: "RAG document probe",
  instructions: `${getAsesorJuridicoSystemPrompt(ASESOR_JURIDICO_SYSTEM_PROMPT_DEFAULT)}${RAG_PROBE_INSTRUCTIONS_SUFFIX}`,
  model: getOpenAIWorkflowModel(),
  tools: [fileSearch],
  outputType: RagFirstResultSchema,
  modelSettings: {
    temperature: 0,
    topP: 1,
    maxTokens: 8192,
    store: true,
  },
})

type WorkflowInput = { input_as_text: string }

export type RunWorkflowOptions = {
  /** Si true, no se ejecutan guardrails (evita que el prompt largo del RAG dispare jailbreak y devuelva el JSON de guardrails en vez de la respuesta del agente). */
  skipGuardrails?: boolean
}

/**
 * Run the workflow with conversation history
 */
export async function runWorkflow(
  inputText: string,
  conversationHistory: ChatMessage[] = [],
  options: RunWorkflowOptions = {}
): Promise<string> {
  const { skipGuardrails = false } = options
  const workflow: WorkflowInput = {
    input_as_text: inputText,
  }

  // Convert conversation history to AgentInputItem format
  const agentHistory: AgentInputItem[] = convertMessagesToAgentInput(conversationHistory)

  // Add current user message
  agentHistory.push({
    role: "user",
    content: [{ type: "input_text", text: inputText }],
  })

  return await withTrace("EvaJuridico", async () => {
    const state = {}

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: WORKFLOW_ID,
      },
    })

    if (!skipGuardrails) {
      const guardrailsInputText = workflow.input_as_text
      const {
        hasTripwire: guardrailsHasTripwire,
        safeText: guardrailsAnonymizedText,
        failOutput: guardrailsFailOutput,
        passOutput: guardrailsPassOutput,
      } = await runAndApplyGuardrails(guardrailsInputText, getJailbreakGuardrailConfig(), agentHistory, workflow)

      const guardrailsOutput = guardrailsHasTripwire ? guardrailsFailOutput : guardrailsPassOutput

      if (guardrailsHasTripwire) {
        return JSON.stringify(guardrailsOutput)
      }
      // Update conversation history with safe text
      if (agentHistory.length > 0) {
        const lastMessage = agentHistory[agentHistory.length - 1]
        if (lastMessage.content && lastMessage.content[0] && lastMessage.content[0].type === "input_text") {
          lastMessage.content[0].text = guardrailsAnonymizedText
        }
      }
    }

    {
      const classificationAgentResultTemp = await runner.run(classificationAgent, [...agentHistory])
      agentHistory.push(...classificationAgentResultTemp.newItems.map((item: any) => item.rawItem))

      if (!classificationAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined")
      }

      const classificationAgentResult = {
        output_text: JSON.stringify(classificationAgentResultTemp.finalOutput),
        output_parsed: classificationAgentResultTemp.finalOutput,
      }

      if (classificationAgentResult.output_parsed.classification === "process_guidance") {
        const processAgentResultTemp = await runner.run(processGuidanceAgent, [...agentHistory])
        agentHistory.push(...processAgentResultTemp.newItems.map((item: any) => item.rawItem))

        if (!processAgentResultTemp.finalOutput) {
          throw new Error("Agent result is undefined")
        }

        const processAgentResult = {
          output_text: processAgentResultTemp.finalOutput ?? "",
        }
        return extractOutputText(processAgentResult)
      } else if (classificationAgentResult.output_parsed.classification === "contract_consultation") {
        const contractAgentResultTemp = await runner.run(contractConsultationAgent, [...agentHistory])
        agentHistory.push(...contractAgentResultTemp.newItems.map((item: any) => item.rawItem))

        if (!contractAgentResultTemp.finalOutput) {
          throw new Error("Agent result is undefined")
        }

        const contractAgentResult = {
          output_text: contractAgentResultTemp.finalOutput ?? "",
        }
        return extractOutputText(contractAgentResult)
      } else if (classificationAgentResult.output_parsed.classification === "legal_research") {
        const researchAgentResultTemp = await runner.run(legalResearchAgent, [...agentHistory])
        agentHistory.push(...researchAgentResultTemp.newItems.map((item: any) => item.rawItem))

        if (!researchAgentResultTemp.finalOutput) {
          throw new Error("Agent result is undefined")
        }

        const researchAgentResult = {
          output_text: researchAgentResultTemp.finalOutput ?? "",
        }
        return extractOutputText(researchAgentResult)
      } else {
        // general_information
        const generalAgentResultTemp = await runner.run(generalInformationAgent, [...agentHistory])
        agentHistory.push(...generalAgentResultTemp.newItems.map((item: any) => item.rawItem))

        if (!generalAgentResultTemp.finalOutput) {
          throw new Error("Agent result is undefined")
        }

        const generalAgentResult = {
          output_text: generalAgentResultTemp.finalOutput ?? "",
        }
        return extractOutputText(generalAgentResult)
      }
    }
  })
}

const GENERAL_FALLBACK_FOOTER = `\n\n---\n**Nota:** Respuesta en **modo asesor normativo** (no hubo material suficiente en los documentos indexados del repositorio para responder solo con archivos). Contrastar con un abogado titulado ante el caso concreto.`

const DOCS_ANSWER_PREFIX = "**Fuente:** documentos indexados en el sistema.\n\n"

/**
 * Orquestación para el chat del asistente: primero RAG (file_search + salida estructurada);
 * si no alcanza, respuesta con modelo de chat y temperatura 0 según {@link ASESOR_JURIDICO_SYSTEM_PROMPT}.
 */
export async function runRagFirstThenGeneralChat(
  inputText: string,
  conversationHistory: ChatMessage[] = [],
  options: RunWorkflowOptions = {},
): Promise<{ text: string; source: "documents" | "general" }> {
  const { skipGuardrails = false } = options
  const workflow: WorkflowInput = { input_as_text: inputText }

  const agentHistory: AgentInputItem[] = convertMessagesToAgentInput(conversationHistory)
  agentHistory.push({
    role: "user",
    content: [{ type: "input_text", text: inputText }],
  })

  return await withTrace("EvaJuridicoRagFirst", async () => {
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "eva-rag-first",
        workflow_id: WORKFLOW_ID || "eva-rag-first",
      },
    })

    let effectiveUserText = inputText

    if (!skipGuardrails) {
      const guardrailsInputText = workflow.input_as_text
      const {
        hasTripwire: guardrailsHasTripwire,
        safeText: guardrailsAnonymizedText,
        failOutput: guardrailsFailOutput,
        passOutput: guardrailsPassOutput,
      } = await runAndApplyGuardrails(guardrailsInputText, getJailbreakGuardrailConfig(), agentHistory, workflow)

      const guardrailsOutput = guardrailsHasTripwire ? guardrailsFailOutput : guardrailsPassOutput

      if (guardrailsHasTripwire) {
        return {
          text: JSON.stringify(guardrailsOutput),
          source: "general",
        }
      }
      if (agentHistory.length > 0) {
        const lastMessage = agentHistory[agentHistory.length - 1]
        if (lastMessage.content && lastMessage.content[0] && lastMessage.content[0].type === "input_text") {
          lastMessage.content[0].text = guardrailsAnonymizedText
          effectiveUserText = guardrailsAnonymizedText
        }
      }
    }

    const probeResult = await runner.run(ragDocumentProbeAgent, [...agentHistory])
    const parsed = probeResult.finalOutput as z.infer<typeof RagFirstResultSchema> | undefined

    if (
      parsed &&
      parsed.sufficient === true &&
      typeof parsed.groundedAnswer === "string" &&
      parsed.groundedAnswer.trim().length > 0
    ) {
      return {
        text: `${DOCS_ANSWER_PREFIX}${parsed.groundedAnswer.trim()}`,
        source: "documents",
      }
    }

    const openaiModel = openai(getOpenAIModel() as "gpt-4o")
    const historyMessages = [
      ...conversationHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: effectiveUserText },
    ]

    const result = await generateText({
      model: openaiModel,
      system: getAsesorJuridicoSystemPrompt(ASESOR_JURIDICO_SYSTEM_PROMPT_DEFAULT),
      messages: historyMessages,
      temperature: getAsesorJuridicoTemperature(ASESOR_JURIDICO_TEMPERATURE_DEFAULT),
      maxTokens: 4096,
    })

    const body = (result.text || "").trim()
    return {
      text: body ? `${body}${GENERAL_FALLBACK_FOOTER}` : `No fue posible generar una respuesta.${GENERAL_FALLBACK_FOOTER}`,
      source: "general",
    }
  })
}
