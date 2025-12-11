/**
 * Text improvement utility using AI
 * Extends the ai-chat library for single text improvement requests
 */

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export interface ImproveTextOptions {
  /** Text to improve */
  text: string
  /** Field name/type for context-specific improvements */
  fieldName?: string
  /** Field label for context */
  fieldLabel?: string
  /** Field help text or description */
  fieldHelpText?: string
  /** Entity name for context */
  entityName?: string
  /** Process type name (e.g., "Contratación Directa", "Licitación Pública") */
  processTypeName?: string
  /** Process type description */
  processTypeDescription?: string
  /** Legal basis for the process type */
  legalBasis?: string
  /** Secretary name for context */
  secretaryName?: string
  /** Custom system prompt */
  systemPrompt?: string
  /** AI model to use (default: openai/gpt-4o) */
  model?: string
}

/**
 * System prompt for legal text improvement
 */
const DEFAULT_SYSTEM_PROMPT = `Eres EVA, un asistente jurídico especializado en contratación pública colombiana. Tu tarea es mejorar la redacción de textos jurídicos y administrativos relacionados con procesos de contratación.

Instrucciones:
- Mejora la redacción manteniendo el sentido original
- Usa lenguaje jurídico formal y preciso
- Asegúrate de que el texto sea claro, conciso y profesional
- Incorpora referencias a normativa cuando sea relevante (Ley 80 de 1993, Decreto 1082 de 2015, etc.)
- Mantén la estructura y formato del texto original
- No agregues información que no esté implícita en el texto original
- Responde SOLO con el texto mejorado, sin explicaciones adicionales`

/**
 * Field-specific context and requirements
 */
const FIELD_CONTEXT: Record<string, { normativa: string; requisitos: string }> = {
  object: {
    normativa: "Artículo 2.2.1.1.1.1 del Decreto 1082 de 2015",
    requisitos: "Debe ser claro, específico, identificar el bien o servicio a contratar, y permitir determinar el alcance exacto de la prestación."
  },
  justification: {
    normativa: "Artículo 2.2.1.1.1.2 del Decreto 1082 de 2015",
    requisitos: "Debe incluir: (1) la necesidad que se pretende satisfacer, (2) el origen de los recursos, (3) la vinculación con el plan de desarrollo y el plan anual de adquisiciones, y (4) la justificación de la modalidad de selección elegida."
  },
  scope: {
    normativa: "Artículo 2.2.1.1.1.3 del Decreto 1082 de 2015",
    requisitos: "Debe ser detallada y precisa, incluyendo todas las actividades, entregables, especificaciones técnicas, condiciones de calidad, y cualquier otro elemento necesario para la correcta ejecución del contrato."
  },
  obligations: {
    normativa: "Artículo 2.2.1.1.1.4 del Decreto 1082 de 2015",
    requisitos: "Debe ser clara, específica, enumerada, y conforme a la normativa vigente. Debe incluir obligaciones de ejecución, calidad, plazos, y cumplimiento normativo."
  },
  qualificationCriteria: {
    normativa: "Artículo 5 de la Ley 1150 de 2007 y artículo 2.2.1.1.1.5 del Decreto 1082 de 2015",
    requisitos: "Debe ser objetiva, medible, verificable mediante documentos, y garantizar la selección del mejor oferente. Los criterios deben estar claramente definidos y ponderados."
  },
  experience: {
    normativa: "Artículo 2.2.1.1.1.6 del Decreto 1082 de 2015",
    requisitos: "Debe ser específica, verificable mediante contratos ejecutados, actas de liquidación o certificaciones de cumplimiento expedidas por las entidades contratantes. Debe relacionarse directamente con el objeto del contrato."
  },
  guarantees: {
    normativa: "Artículo 2.2.1.1.1.7 del Decreto 1082 de 2015",
    requisitos: "Debe especificar el tipo de garantía (cumplimiento, seriedad de oferta, etc.), el monto (porcentaje del valor del contrato), y la vigencia (debe permanecer vigente durante el plazo de ejecución y cuatro meses más)."
  },
}

/**
 * Improves text using AI
 * 
 * @example
 * ```ts
 * const improved = await improveText({
 *   text: "Necesito comprar computadores",
 *   fieldName: "object",
 *   entityName: "Alcaldía de Bogotá"
 * })
 * ```
 */
export async function improveText(options: ImproveTextOptions): Promise<string> {
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
    model = "openai/gpt-4o",
  } = options

  if (!text.trim()) {
    throw new Error("Text cannot be empty")
  }

  try {
    // Build comprehensive system prompt with context
    let finalSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT
    
    // Add process type context
    if (processTypeName) {
      finalSystemPrompt += `\n\nCONTEXTO DEL PROCESO DE CONTRATACIÓN:`
      finalSystemPrompt += `\n- Tipo de proceso: ${processTypeName}`
      if (processTypeDescription) {
        finalSystemPrompt += `\n- Descripción: ${processTypeDescription}`
      }
      if (legalBasis) {
        finalSystemPrompt += `\n- Base legal: ${legalBasis}`
      }
    }

    // Add entity context
    if (entityName) {
      finalSystemPrompt += `\n- Entidad contratante: ${entityName}`
    }

    // Add secretary context
    if (secretaryName) {
      finalSystemPrompt += `\n- Secretaría responsable: ${secretaryName}`
    }

    // Add field-specific context
    if (fieldName) {
      finalSystemPrompt += `\n\nCONTEXTO DEL CAMPO A MEJORAR:`
      if (fieldLabel) {
        finalSystemPrompt += `\n- Campo: ${fieldLabel}`
      } else if (fieldName) {
        finalSystemPrompt += `\n- Campo: ${fieldName}`
      }
      
      if (fieldHelpText) {
        finalSystemPrompt += `\n- Descripción del campo: ${fieldHelpText}`
      }

      // Add field-specific requirements
      if (FIELD_CONTEXT[fieldName]) {
        const fieldInfo = FIELD_CONTEXT[fieldName]
        finalSystemPrompt += `\n- Normativa aplicable: ${fieldInfo.normativa}`
        finalSystemPrompt += `\n- Requisitos específicos: ${fieldInfo.requisitos}`
      }
    }

    // Build user prompt with clear instructions
    let userPrompt = `TEXTO ORIGINAL A MEJORAR:\n\n${text}\n\n`
    userPrompt += `INSTRUCCIONES ESPECÍFICAS:\n`
    userPrompt += `1. Mejora la redacción manteniendo el sentido y la intención original del texto.\n`
    userPrompt += `2. Asegúrate de que el texto mejorado cumpla con todos los requisitos normativos mencionados.\n`
    userPrompt += `3. Usa lenguaje jurídico formal, preciso y profesional.\n`
    userPrompt += `4. Incorpora referencias a la normativa aplicable cuando sea relevante.\n`
    userPrompt += `5. Mantén la estructura y formato del texto original.\n`
    userPrompt += `6. No agregues información que no esté implícita o sugerida en el texto original.\n`
    userPrompt += `7. Responde SOLO con el texto mejorado, sin explicaciones adicionales ni comentarios.\n`

    // Map model string to OpenAI model
    let openaiModel
    if (model?.startsWith("openai/")) {
      const modelName = model.replace("openai/", "")
      openaiModel = openai(modelName as any)
    } else {
      openaiModel = openai("gpt-4o")
    }

    // Generate improved text
    const result = await generateText({
      model: openaiModel,
      system: finalSystemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    })

    return result.text.trim()
  } catch (error: any) {
    console.error("[AI Text Improvement] Error:", error)
    
    // Handle specific OpenAI errors
    if (error?.error?.type === "insufficient_quota") {
      throw new Error("OpenAI quota exceeded. Please check your billing and add credits to your OpenAI account.")
    }
    
    if (error?.error?.type === "invalid_api_key" || error?.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.")
    }
    
    throw new Error(`Failed to improve text: ${error?.message || "Unknown error"}`)
  }
}

