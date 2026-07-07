import { z } from "zod"

export const SmartFillContextSchema = z.object({
  processId: z.string().uuid(),
  entityId: z.string().uuid(),
  entityName: z.string(),
  secretaryId: z.string().optional(),
  secretaryName: z.string(),
  processTypeId: z.string().uuid(),
  processTypeName: z.string(),
  processObject: z.string().optional(),
  processDescription: z.string().optional(),
})

export const SmartFillRequestSchema = z.object({
  userContext: z.string().min(1, "El contexto del usuario es requerido"),
  tags: z.array(z.string()).min(1, "Se requiere al menos una etiqueta"),
  context: SmartFillContextSchema,
})

export type SmartFillContext = z.infer<typeof SmartFillContextSchema>
export type SmartFillRequest = z.infer<typeof SmartFillRequestSchema>

export type SmartFillPhaseStatus = "done" | "skipped" | "error"

export type SmartFillPhase = {
  id: string
  label: string
  status: SmartFillPhaseStatus
}

export type SmartFillStats = {
  filled: number
  total: number
  ragCount: number
  generatedCount: number
  enrichedCount: number
}

export type SmartFillResult = {
  formData: Record<string, string>
  tableData: Record<string, Array<Record<string, string>>>
  phases: SmartFillPhase[]
  stats: SmartFillStats
}

export type TagClassification = {
  rag: string[]
  generate: string[]
  extract: string[]
  enrich: string[]
  skip: string[]
}
