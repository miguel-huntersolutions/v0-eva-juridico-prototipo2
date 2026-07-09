import { getMcpServiceClient } from "./service-client"
import type { ResolvedMcpUser } from "./resolve-user"

export type EntityOption = {
  id: string
  name: string
  secretaryIds?: string[]
}

export async function getEntitiesForMcpUser(user: ResolvedMcpUser): Promise<EntityOption[]> {
  const supabase = getMcpServiceClient()

  if (user.role === "superadmin") {
    const { data } = await supabase.from("entities").select("id, name").eq("status", "active").order("name")
    return (data || []).map((e) => ({ id: e.id, name: e.name }))
  }

  if (user.role === "admin" && user.organizationId) {
    const { data } = await supabase
      .from("entities")
      .select("id, name")
      .eq("organization_id", user.organizationId)
      .eq("status", "active")
      .order("name")
    return (data || []).map((e) => ({ id: e.id, name: e.name }))
  }

  const { data: assignments } = await supabase
    .from("member_entities")
    .select("entity_id")
    .eq("member_id", user.profileId)

  const entityIds = (assignments || []).map((a) => a.entity_id).filter(Boolean)
  if (entityIds.length === 0) return []

  const { data: entities } = await supabase
    .from("entities")
    .select("id, name")
    .in("id", entityIds)
    .eq("status", "active")
    .order("name")

  return (entities || []).map((e) => ({ id: e.id, name: e.name }))
}

export async function assertEntityAccess(
  user: ResolvedMcpUser,
  entityId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const allowed = await getEntitiesForMcpUser(user)
  if (!allowed.some((e) => e.id === entityId)) {
    return { ok: false, error: "No tiene acceso a esta entidad." }
  }
  return { ok: true }
}

export async function assertSecretaryBelongsToEntity(
  secretaryId: string,
  entityId: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const supabase = getMcpServiceClient()
  const { data } = await supabase
    .from("secretaries")
    .select("id, name, entity_id")
    .eq("id", secretaryId)
    .maybeSingle()

  if (!data || data.entity_id !== entityId) {
    return { ok: false, error: "Secretaría no válida para la entidad." }
  }
  return { ok: true, name: data.name }
}

export async function getEntityById(entityId: string) {
  const supabase = getMcpServiceClient()
  const { data } = await supabase.from("entities").select("id, name, organization_id").eq("id", entityId).single()
  return data
}

export async function getProcessTypeById(processTypeId: string) {
  const supabase = getMcpServiceClient()
  const { data } = await supabase.from("process_types").select("id, name, description").eq("id", processTypeId).single()
  return data
}
