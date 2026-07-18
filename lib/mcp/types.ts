import { z } from "zod"

export const McpChannelSchema = z.enum(["telegram", "whatsapp", "other"])

export const McpLinkUserSchema = z.object({
  channel: McpChannelSchema,
  externalUserId: z.string().min(1),
  phone: z.string().min(8),
})

export const McpEntitiesQuerySchema = z.object({
  channel: McpChannelSchema,
  externalUserId: z.string().min(1),
  phone: z.string().optional(),
})

export const McpChannelUserQuerySchema = z.object({
  channel: McpChannelSchema,
  externalUserId: z.string().min(1),
  phone: z.string().optional(),
})

export const McpProcessesQuerySchema = McpChannelUserQuerySchema.extend({
  entityId: z.string().uuid().optional(),
  processCode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const McpProcessDetailQuerySchema = McpChannelUserQuerySchema

export const McpGenerateSmartSchema = z.object({
  mode: z.literal("auto_generate").default("auto_generate"),
  channel: McpChannelSchema,
  externalUserId: z.string().min(1),
  phone: z.string().optional(),
  entityId: z.string().uuid(),
  secretaryId: z.string().uuid(),
  processTypeId: z.string().uuid(),
  userContext: z.string().min(1),
  /** Si false, no genera cuando hay gaps críticos (imágenes). Tablas siempre permitidas vacías. */
  allowPartial: z.boolean().default(true),
})

export type McpGenerateSmartRequest = z.infer<typeof McpGenerateSmartSchema>

/** Pregunta al asistente jurídico (RAG + asesor), para canales externos. */
export const McpAskSchema = z.object({
  channel: McpChannelSchema,
  externalUserId: z.string().min(1),
  phone: z.string().optional(),
  message: z.string().min(1).max(8000),
  /** Últimos turnos de la conversación (el bot los mantiene). */
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .max(20)
    .optional(),
  /** Contexto opcional (proceso/entidad) para enriquecer la pregunta. */
  processId: z.string().uuid().optional(),
  entityId: z.string().uuid().optional(),
})

export type McpAskRequest = z.infer<typeof McpAskSchema>
