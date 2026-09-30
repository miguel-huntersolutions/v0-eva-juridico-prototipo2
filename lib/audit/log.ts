/**
 * CAP-09 (RF-031): helper de auditoría del lado del servidor.
 *
 * Inserta eventos en `audit_log` con service role (la tabla no tiene políticas
 * de escritura para usuarios). La tabla es INALTERABLE: triggers de BD rechazan
 * cualquier UPDATE/DELETE (CA-031.2).
 *
 * Reglas:
 * - Nunca guardar contenido completo de documentos ni de consultas (solo
 *   metadatos en `details`).
 * - Nunca lanzar error hacia la operación principal: la auditoría registra,
 *   no bloquea. Los fallos se reportan a consola del servidor.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type AuditAction =
  | "process_created"
  | "process_updated"
  | "process_deleted"
  | "process_reused"
  | "process_assigned"
  | "process_unassigned"
  | "status_changed"
  | "draft_saved"
  | "document_generated"
  | "document_regenerated"
  | "document_opened"
  | "document_downloaded"
  | "document_sent_to_review"
  | "document_approved"
  | "document_rejected"
  | "attachment_uploaded"
  | "entity_access_granted"
  | "member_invited"
  | "login"
  | "eva_query"

export interface AuditEventInput {
  organizationId?: string | null // si no viene, se resuelve por proceso o actor
  processId?: string | null
  documentId?: string | null
  actorId?: string | null
  action: AuditAction
  details?: Record<string, unknown>
  ip?: string | null
}

let cachedService: SupabaseClient | null = null

function getServiceClient(): SupabaseClient | null {
  if (cachedService) return cachedService
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!key || !url) return null
  cachedService = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cachedService
}

/** IP del caller desde los headers del request (Vercel/Next). */
export function getRequestIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]?.trim() || null
  return request.headers.get("x-real-ip")
}

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    const service = getServiceClient()
    if (!service) {
      console.warn("[audit] SUPABASE_SERVICE_ROLE_KEY no configurada; evento omitido:", input.action)
      return
    }

    let organizationId = input.organizationId ?? null

    // Resolver la organización por el proceso (fuente más confiable)
    if (!organizationId && input.processId) {
      const { data: proc } = await service
        .from("processes")
        .select("entity:entities(organization_id)")
        .eq("id", input.processId)
        .single()
      organizationId = (proc?.entity as any)?.organization_id ?? null
    }
    // Si no hay proceso, por el actor
    if (!organizationId && input.actorId) {
      const { data: actor } = await service
        .from("profiles")
        .select("organization_id")
        .eq("id", input.actorId)
        .single()
      organizationId = actor?.organization_id ?? null
    }

    if (!organizationId) {
      console.warn("[audit] Sin organization_id; evento omitido:", input.action)
      return
    }

    const { error } = await service.from("audit_log").insert({
      organization_id: organizationId,
      process_id: input.processId ?? null,
      document_id: input.documentId ?? null,
      actor_id: input.actorId ?? null,
      action: input.action,
      details: input.details ?? null,
      ip: input.ip ?? null,
    })
    if (error) console.warn("[audit] Error insertando evento:", input.action, error.message)
  } catch (err) {
    // La auditoría nunca rompe la operación principal
    console.warn("[audit] Excepción registrando evento:", input.action, err)
  }
}
