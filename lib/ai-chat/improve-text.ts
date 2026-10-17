/**
 * Text improvement utility using AI
 * Extends the ai-chat library for single text improvement requests
 */

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { getOpenAIModel, getOpenAIChatModelString, temperatureOptionForModel } from "@/lib/ai-model-config"

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
  /** AI model to use (default from OPENAI_MODEL env) */
  model?: string
}

/**
 * System prompt for legal text improvement
 */
const DEFAULT_SYSTEM_PROMPT = `Eres EVA, un asistente jurídico especializado en contratación pública colombiana. Tu tarea es mejorar y ampliar textos jurídicos y administrativos relacionados con procesos de contratación, incorporando el contexto completo del proceso.

Instrucciones generales:
- Mejora la redacción manteniendo y respetando la intención original del usuario
- AMPLÍA la información cuando sea necesario para cumplir con los requisitos normativos
- Usa lenguaje jurídico formal, preciso y profesional
- Incorpora referencias a normativa cuando sea relevante (Ley 80 de 1993, Decreto 1082 de 2015, etc.)
- Considera el contexto completo: entidad, secretaría, tipo de proceso
- El texto mejorado debe ser más completo y detallado que el original, pero siempre basado en lo que el usuario proporcionó
- Responde SOLO con el texto mejorado, sin explicaciones adicionales`

/**
 * Field-specific context and requirements
 */
const FIELD_CONTEXT: Record<string, { normativa: string; requisitos: string; instrucciones: string }> = {
  object: {
    normativa: "Artículo 2.2.1.1.1.1 del Decreto 1082 de 2015",
    requisitos: "Debe ser claro, específico, identificar el bien o servicio a contratar, y permitir determinar el alcance exacto de la prestación.",
    instrucciones: `INSTRUCCIONES ESPECÍFICAS PARA EL OBJETO DEL PROCESO:
1. AMPLÍA el texto original incorporando información relevante sobre:
   - El bien o servicio específico a contratar (cantidades aproximadas si aplica, características principales)
   - La finalidad o uso previsto del bien/servicio
   - La entidad y secretaría que lo requiere (si está disponible en el contexto)
   - El tipo de proceso de contratación (si está disponible en el contexto)

2. Mejora la redacción usando lenguaje jurídico formal y preciso

3. Asegúrate de que el objeto sea:
   - Específico y claro
   - Identifique inequívocamente qué se va a contratar
   - Permita determinar el alcance exacto de la prestación
   - Sea coherente con el tipo de proceso seleccionado

4. Si el texto original es muy breve, amplíalo significativamente incorporando detalles relevantes que sean lógicos y apropiados para el contexto proporcionado

5. Mantén la esencia y propósito original del texto del usuario, pero enriquécelo con información profesional y normativa`
  },
  description: {
    normativa: "Artículo 2.2.1.1.1.3 del Decreto 1082 de 2015",
    requisitos: "Debe ser detallada y precisa, incluyendo todas las actividades, entregables, especificaciones técnicas, condiciones de calidad, y cualquier otro elemento necesario para la correcta ejecución del contrato.",
    instrucciones: `INSTRUCCIONES ESPECÍFICAS PARA LA DESCRIPCIÓN DETALLADA:
1. AMPLÍA significativamente el texto original incorporando:
   - Alcance completo del proceso o contrato
   - Especificaciones técnicas detalladas (si aplica)
   - Actividades y entregables esperados
   - Condiciones de calidad y estándares aplicables
   - Plazos y cronograma (si es relevante)
   - Contexto de la entidad y secretaría (si está disponible)
   - Relación con el tipo de proceso seleccionado (si está disponible)

2. Estructura la descripción de manera profesional y organizada

3. Si el texto original es breve o incompleto, amplíalo considerablemente con información relevante y profesional que sea apropiada para el contexto

4. Incorpora referencias a normativa aplicable cuando sea pertinente

5. Asegúrate de que la descripción sea:
   - Completa y detallada
   - Técnicamente precisa
   - Alineada con el objeto del proceso
   - Coherente con el tipo de proceso de contratación

6. Mantén la intención original del usuario pero enriquécela con detalles profesionales y normativos`
  },
  justification: {
    normativa: "Artículo 2.2.1.1.1.2 del Decreto 1082 de 2015",
    requisitos: "Debe incluir: (1) la necesidad que se pretende satisfacer, (2) el origen de los recursos, (3) la vinculación con el plan de desarrollo y el plan anual de adquisiciones, y (4) la justificación de la modalidad de selección elegida.",
    instrucciones: "Amplía el texto incorporando todos los elementos requeridos por la normativa."
  },
  scope: {
    normativa: "Artículo 2.2.1.1.1.3 del Decreto 1082 de 2015",
    requisitos: "Debe ser detallada y precisa, incluyendo todas las actividades, entregables, especificaciones técnicas, condiciones de calidad, y cualquier otro elemento necesario para la correcta ejecución del contrato.",
    instrucciones: "Amplía el texto incorporando todas las actividades, entregables y especificaciones técnicas necesarias."
  },
  obligations: {
    normativa: "Artículo 2.2.1.1.1.4 del Decreto 1082 de 2015",
    requisitos: "Debe ser clara, específica, enumerada, y conforme a la normativa vigente. Debe incluir obligaciones de ejecución, calidad, plazos, y cumplimiento normativo.",
    instrucciones: "Amplía el texto incorporando todas las obligaciones relevantes de forma clara y enumerada."
  },
  qualificationCriteria: {
    normativa: "Artículo 5 de la Ley 1150 de 2007 y artículo 2.2.1.1.1.5 del Decreto 1082 de 2015",
    requisitos: "Debe ser objetiva, medible, verificable mediante documentos, y garantizar la selección del mejor oferente. Los criterios deben estar claramente definidos y ponderados.",
    instrucciones: "Amplía el texto incorporando criterios objetivos, medibles y verificables con sus ponderaciones."
  },
  experience: {
    normativa: "Artículo 2.2.1.1.1.6 del Decreto 1082 de 2015",
    requisitos: "Debe ser específica, verificable mediante contratos ejecutados, actas de liquidación o certificaciones de cumplimiento expedidas por las entidades contratantes. Debe relacionarse directamente con el objeto del contrato.",
    instrucciones: "Amplía el texto especificando los requisitos de experiencia de forma verificable y relacionada con el objeto."
  },
  guarantees: {
    normativa: "Artículo 2.2.1.1.1.7 del Decreto 1082 de 2015",
    requisitos: "Debe especificar el tipo de garantía (cumplimiento, seriedad de oferta, etc.), el monto (porcentaje del valor del contrato), y la vigencia (debe permanecer vigente durante el plazo de ejecución y cuatro meses más).",
    instrucciones: "Amplía el texto especificando tipo, monto y vigencia de las garantías requeridas."
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
    model = getOpenAIChatModelString(),
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
        // Add field-specific instructions if available
        if (fieldInfo.instrucciones) {
          finalSystemPrompt += `\n\n${fieldInfo.instrucciones}`
        }
      }
    }

    // Build user prompt with clear instructions
    let userPrompt = `TEXTO ORIGINAL PROPORCIONADO POR EL USUARIO:\n\n${text}\n\n`
    
    // Add context summary
    userPrompt += `CONTEXTO DISPONIBLE:\n`
    if (entityName) {
      userPrompt += `- Entidad: ${entityName}\n`
    }
    if (secretaryName) {
      userPrompt += `- Secretaría: ${secretaryName}\n`
    }
    if (processTypeName) {
      userPrompt += `- Tipo de proceso: ${processTypeName}\n`
      if (processTypeDescription) {
        userPrompt += `- Descripción del tipo: ${processTypeDescription}\n`
      }
    }
    userPrompt += `\n`
    
    userPrompt += `INSTRUCCIONES:\n`
    userPrompt += `1. RESPETA y MANTÉN la intención y propósito original del texto del usuario.\n`
    userPrompt += `2. AMPLÍA el texto incorporando información relevante basada en:\n`
    userPrompt += `   - El contexto de la entidad, secretaría y tipo de proceso (si está disponible)\n`
    userPrompt += `   - Los requisitos normativos aplicables al campo\n`
    userPrompt += `   - Mejores prácticas en contratación pública colombiana\n`
    userPrompt += `3. Mejora la redacción usando lenguaje jurídico formal, preciso y profesional.\n`
    userPrompt += `4. Incorpora referencias a normativa aplicable cuando sea relevante.\n`
    userPrompt += `5. Si el texto original es breve, amplíalo significativamente con información profesional y apropiada.\n`
    userPrompt += `6. El texto mejorado debe ser más completo y detallado, pero siempre coherente con lo que el usuario proporcionó.\n`
    userPrompt += `7. Responde SOLO con el texto mejorado y ampliado, sin explicaciones adicionales ni comentarios.\n`

    // Map model string to OpenAI model
    let openaiModel
    let modelId = getOpenAIModel()
    if (model?.startsWith("openai/")) {
      modelId = model.replace("openai/", "")
      openaiModel = openai(modelId as any)
    } else {
      openaiModel = openai(modelId as "gpt-4o")
    }

    // Generate improved text
    const result = await generateText({
      model: openaiModel,
      system: finalSystemPrompt,
      prompt: userPrompt,
      ...temperatureOptionForModel(modelId, 0.7),
      maxTokens: 2000,
    })

    return result.text.trim()
  } catch (error: any) {
    
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

