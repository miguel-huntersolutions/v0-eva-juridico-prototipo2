// Client-side Data Access Layer for Supabase
import { createBrowserClient } from "./client"
import type {
  Organization,
  Entity,
  Secretary,
  ProcessType,
  Process,
  Document,
  Profile,
  ProcessWithRelations,
  DocumentWithRelations,
} from "./data-access"

// Re-export types
export type {
  Organization,
  Entity,
  Secretary,
  ProcessType,
  Process,
  Document,
  Profile,
  ProcessWithRelations,
  DocumentWithRelations,
}

// Client-side Entity type (with camelCase fields matching the mapped return values)
export interface EntityMapped {
  id: string
  name: string
  nit: string
  representativeName: string
  organizationId: string
  logoUrl?: string | null
  status: "active" | "inactive"
  processesCount: number
  documentsCount?: number
  createdAt?: string
}

// Client-side Template type (with camelCase fields matching the mapped return values)
export interface Template {
  id: string
  name: string
  processTypeId: string
  fileUrl: string
  variables?: string[]
  createdAt: string
  /** Entidad cliente; null = aplica a cualquier entidad (plantillas legadas). */
  entityId?: string | null
  entityName?: string | null
}

/** Entidades activas para asignar plantillas (superadmin). */
export interface TemplateEntityOption {
  id: string
  name: string
  nit: string
  organizationId: string
  organizationName: string
}

export async function getTemplateEntityOptions(): Promise<TemplateEntityOption[]> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase
    .from("entities")
    .select("id, name, nit, organization_id, organization:organizations(name)")
    .eq("status", "active")
    .order("name")

  if (error) throw error

  return (data || []).map((e: Record<string, unknown>) => {
    const org = e.organization as { name?: string } | null | undefined
    return {
      id: e.id as string,
      name: e.name as string,
      nit: (e.nit as string) || "",
      organizationId: e.organization_id as string,
      organizationName: org?.name || "Organización",
    }
  })
}

function mapDbTemplateRow(t: Record<string, unknown>): Template {
  const ent = t.entity as { name?: string } | null | undefined
  return {
    id: t.id as string,
    name: t.name as string,
    processTypeId: (t.process_type_id as string) || "",
    fileUrl: (t.file_url as string) || "",
    variables: (t.variables as string[]) || [],
    createdAt: typeof t.created_at === "string" ? t.created_at.split("T")[0] : "",
    entityId: (t.entity_id as string | null) ?? null,
    entityName: ent?.name ?? null,
  }
}

// Client-side Process type (with camelCase fields matching the mapped return values from getProcessesMapped)
export interface ProcessMapped {
  id: string
  code: string
  object: string
  description: string
  status: "draft" | "in_progress" | "review" | "completed" | "archived"
  entityId: string
  entityName: string
  secretaryId: string
  secretaryName: string
  processTypeId: string
  processTypeName: string
  createdAt: string
  updatedAt: string
  documentsCount: number
  currentVersion: number
  spreadsheetId?: string | null
  spreadsheetUrl?: string | null
  driveFolderId?: string | null
  driveFolderUrl?: string | null
}

// Client-side Organization type with camelCase fields
export interface OrganizationMapped {
  id: string
  name: string
  nit: string
  status: "active" | "inactive"
  createdAt: string
  updatedAt: string
  membersCount?: number
  entitiesCount?: number
}

// Organizations
export async function getOrganizations(): Promise<OrganizationMapped[]> {
  const supabase = createBrowserClient()
  
  // Get organizations - filter by active status for public access
  // This allows unauthenticated users to see organizations during signup
  const { data: orgsData, error: orgsError } = await supabase
    .from("organizations")
    .select("*")
    .eq("status", "active") // Only get active organizations
    .order("name")

  if (orgsError) {
    console.error("[getOrganizations] Error fetching organizations:", orgsError)
    throw orgsError
  }

  console.log("[getOrganizations] Fetched organizations:", orgsData?.length || 0)

  // Get counts for all organizations (this might fail for unauthenticated users, so we'll skip it)
  const organizations = await Promise.all(
    (orgsData || []).map(async (org) => {
      // Try to get counts, but don't fail if user is not authenticated
      let membersCount = 0
      let entitiesCount = 0

      try {
        const { count: mCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
        membersCount = mCount || 0
      } catch (err) {
        // Ignore errors for unauthenticated users
        console.warn("[getOrganizations] Could not get members count:", err)
      }

      try {
        const { count: eCount } = await supabase
          .from("entities")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
        entitiesCount = eCount || 0
      } catch (err) {
        // Ignore errors for unauthenticated users
        console.warn("[getOrganizations] Could not get entities count:", err)
      }

      return {
        id: org.id,
        name: org.name,
        nit: org.nit,
        status: org.status,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
        membersCount: membersCount,
        entitiesCount: entitiesCount,
      } as OrganizationMapped
    })
  )

  return organizations
}

export async function createOrganization(data: {
  name: string
  nit: string
  status?: string
}): Promise<OrganizationMapped> {
  const supabase = createBrowserClient()

  const { data: newOrg, error } = await supabase
    .from("organizations")
    .insert({
      name: data.name,
      nit: data.nit,
      status: data.status || "active",
    })
    .select()
    .single()

  if (error) throw error
  
  return {
    id: newOrg.id,
    name: newOrg.name,
    nit: newOrg.nit,
    status: newOrg.status,
    createdAt: newOrg.created_at,
    updatedAt: newOrg.updated_at,
    membersCount: 0,
    entitiesCount: 0,
  } as OrganizationMapped
}

export async function updateOrganization(
  id: string,
  data: Partial<{
    name: string
    nit: string
    status: string
  }>,
) {
  const supabase = createBrowserClient()

  const { data: updatedOrg, error } = await supabase.from("organizations").update(data).eq("id", id).select().single()

  if (error) throw error
  return updatedOrg as Organization
}

export async function deleteOrganization(id: string) {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("organizations").delete().eq("id", id)

  if (error) throw error
}

export async function impersonateOrganization(organizationId: string) {
  // This function is used to set up the impersonation context
  // The actual impersonation is handled by the ImpersonationContext
  // Here we just verify the organization exists
  const supabase = createBrowserClient()

  const { data, error } = await supabase.from("organizations").select("*").eq("id", organizationId).single()

  if (error) throw error
  return data as Organization
}

// Entities
const DOCUMENTS_PROCESS_IDS_CHUNK = 30

/** Fetch document count for many process_ids in chunks to avoid 500/URL length limits. */
async function documentsCountByProcessIds(
  supabase: ReturnType<typeof createBrowserClient>,
  processIds: string[],
): Promise<number> {
  if (processIds.length === 0) return 0
  if (processIds.length <= DOCUMENTS_PROCESS_IDS_CHUNK) {
    const { count } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .in("process_id", processIds)
    return count ?? 0
  }
  let total = 0
  for (let i = 0; i < processIds.length; i += DOCUMENTS_PROCESS_IDS_CHUNK) {
    const chunk = processIds.slice(i, i + DOCUMENTS_PROCESS_IDS_CHUNK)
    const { count } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .in("process_id", chunk)
    total += count ?? 0
  }
  return total
}

/** Fetch process_id list for many process_ids in chunks (for document counts per process). */
async function documentsProcessIdsInChunks(
  supabase: ReturnType<typeof createBrowserClient>,
  processIds: string[],
): Promise<{ process_id: string }[]> {
  if (processIds.length === 0) return []
  if (processIds.length <= DOCUMENTS_PROCESS_IDS_CHUNK) {
    const { data } = await supabase.from("documents").select("process_id").in("process_id", processIds)
    return (data ?? []) as { process_id: string }[]
  }
  const out: { process_id: string }[] = []
  for (let i = 0; i < processIds.length; i += DOCUMENTS_PROCESS_IDS_CHUNK) {
    const chunk = processIds.slice(i, i + DOCUMENTS_PROCESS_IDS_CHUNK)
    const { data } = await supabase.from("documents").select("process_id").in("process_id", chunk)
    out.push(...((data ?? []) as { process_id: string }[]))
  }
  return out
}

export async function getEntities(organizationId?: string): Promise<EntityMapped[]> {
  const supabase = createBrowserClient()
  if (!organizationId) return []
  const { data: entities, error } = await supabase
    .from("entities")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name")
  if (error) throw error
  if (!entities?.length) return []

  const entityIds = entities.map((e) => e.id)
  const { data: processes, error: procErr } = await supabase
    .from("processes")
    .select("id, entity_id")
    .in("entity_id", entityIds)
  if (procErr) throw procErr

  const processIds = (processes || []).map((p) => p.id)
  const processIdsByEntityId: Record<string, string[]> = {}
  for (const e of entities) {
    processIdsByEntityId[e.id] = []
  }
  for (const p of processes || []) {
    const eid = (p as { id: string; entity_id: string }).entity_id
    if (!processIdsByEntityId[eid]) processIdsByEntityId[eid] = []
    processIdsByEntityId[eid].push(p.id)
  }

  let documentCountByProcessId: Record<string, number> = {}
  if (processIds.length > 0) {
    const docs = await documentsProcessIdsInChunks(supabase, processIds)
    for (const d of docs) {
      documentCountByProcessId[d.process_id] = (documentCountByProcessId[d.process_id] || 0) + 1
    }
  }

  return entities.map((e) => {
    const pIds = processIdsByEntityId[e.id] || []
    const documentsCount = pIds.reduce((sum, pid) => sum + (documentCountByProcessId[pid] || 0), 0)
    return {
      id: e.id,
      name: e.name,
      nit: e.nit,
      representativeName: e.representative_name,
      organizationId: e.organization_id,
      logoUrl: e.logo_url,
      status: e.status,
      processesCount: pIds.length,
      documentsCount,
    }
  })
}

/**
 * Fetch entities for an organization via API (service role). Use when impersonating
 * so the admin sees the same entities as the member (RLS would otherwise block).
 */
export async function getEntitiesForImpersonation(organizationId: string): Promise<EntityMapped[]> {
  const res = await fetch(`/api/entities?organizationId=${encodeURIComponent(organizationId)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || res.statusText || "Failed to fetch entities")
  }
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function getProcessesForImpersonation(organizationId: string): Promise<ProcessMapped[]> {
  const res = await fetch(`/api/processes?organizationId=${encodeURIComponent(organizationId)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || res.statusText || "Failed to fetch processes")
  }
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function getProcessMappedForImpersonation(processId: string): Promise<ProcessMapped | null> {
  const res = await fetch(`/api/processes/${encodeURIComponent(processId)}`)
  if (!res.ok) {
    if (res.status === 404) return null
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || res.statusText || "Failed to fetch process")
  }
  const data = await res.json()
  return data
}

/** Same shape as API response: id, processId, processCode, ... (ready for member docs list) */
export async function getDocumentsForImpersonation(organizationId: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`/api/documents?organizationId=${encodeURIComponent(organizationId)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || res.statusText || "Failed to fetch documents")
  }
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function createEntity(data: {
  name: string
  nit: string
  representativeName: string
  organizationId: string
  logoUrl?: string
  status?: string
}): Promise<EntityMapped> {
  const supabase = createBrowserClient()

  const { data: newEntity, error } = await supabase
    .from("entities")
    .insert({
      name: data.name,
      nit: data.nit,
      representative_name: data.representativeName,
      organization_id: data.organizationId,
      logo_url: data.logoUrl,
      status: data.status || "active",
    })
    .select()
    .single()

  if (error) throw error

  // Get processes count
  const { count: processesCount } = await supabase
    .from("processes")
    .select("*", { count: "exact", head: true })
    .eq("entity_id", newEntity.id)

  return {
    id: newEntity.id,
    name: newEntity.name,
    nit: newEntity.nit,
    representativeName: newEntity.representative_name,
    organizationId: newEntity.organization_id,
    logoUrl: newEntity.logo_url,
    status: newEntity.status,
    processesCount: processesCount || 0,
    documentsCount: 0,
  }
}

export async function updateEntity(
  id: string,
  data: Partial<{
    name: string
    nit: string
    representativeName: string
    logoUrl: string
    status: string
  }>,
): Promise<EntityMapped> {
  const supabase = createBrowserClient()

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.nit !== undefined) updateData.nit = data.nit
  if (data.representativeName !== undefined) updateData.representative_name = data.representativeName
  if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl
  if (data.status !== undefined) updateData.status = data.status

  const { data: updatedEntity, error } = await supabase
    .from("entities")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error

  // Get processes count
  const { count: processesCount } = await supabase
    .from("processes")
    .select("*", { count: "exact", head: true })
    .eq("entity_id", id)

  return {
    id: updatedEntity.id,
    name: updatedEntity.name,
    nit: updatedEntity.nit,
    representativeName: updatedEntity.representative_name,
    organizationId: updatedEntity.organization_id,
    logoUrl: updatedEntity.logo_url,
    status: updatedEntity.status,
    processesCount: processesCount || 0,
    documentsCount: 0,
  }
}

export async function deleteEntity(id: string) {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("entities").delete().eq("id", id)

  if (error) throw error
}

// Secretaries
export async function getSecretaries(entityId?: string) {
  const supabase = createBrowserClient()
  console.log("secretaries", entityId)
  let query = supabase.from("secretaries").select("*").order("name")

  if (entityId) {
    query = query.eq("entity_id", entityId)
  }

  const { data, error } = await query
  if (error) {
    console.error("[getSecretaries] Error fetching secretaries:", error)
    throw error
  }
  console.log("[getSecretaries] Secretaries fetched:", data?.length || 0, "for entityId:", entityId)
  return (data || []) as Secretary[]
}

export async function createSecretary(data: {
  name: string
  secretaryName: string
  email: string
  phone?: string
  entityId: string
}): Promise<Secretary> {
  const supabase = createBrowserClient()
  const { data: secretary, error } = await supabase
    .from("secretaries")
    .insert({
      name: data.name,
      secretary_name: data.secretaryName,
      email: data.email,
      phone: data.phone || null,
      entity_id: data.entityId,
    })
    .select()
    .single()

  if (error) throw error
  return secretary as Secretary
}

export async function updateSecretary(
  id: string,
  data: Partial<{
    name: string
    secretaryName: string
    email: string
    phone: string
  }>,
): Promise<Secretary> {
  const supabase = createBrowserClient()
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.secretaryName !== undefined) updateData.secretary_name = data.secretaryName
  if (data.email !== undefined) updateData.email = data.email
  if (data.phone !== undefined) updateData.phone = data.phone

  const { data: secretary, error } = await supabase
    .from("secretaries")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return secretary as Secretary
}

export async function deleteSecretary(id: string) {
  const supabase = createBrowserClient()
  const { error } = await supabase.from("secretaries").delete().eq("id", id)
  if (error) throw error
}

// Process Types
export async function getProcessTypes() {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from("process_types").select("*").order("name")

  if (error) throw error
  return data as ProcessType[]
}

/**
 * Tipos de proceso con al menos una plantilla aplicable a la entidad
 * (plantilla sin `entity_id` o con `entity_id` igual a la entidad).
 * Incluye asociaciones vía `template_process_types` y `templates.process_type_id`.
 */
export async function getProcessTypesForEntity(entityId: string): Promise<ProcessType[]> {
  const id = typeof entityId === "string" ? entityId.trim() : ""
  if (!id) return []

  const templates = await getTemplates(undefined, id)
  if (templates.length === 0) return []

  const supabase = createBrowserClient()
  const templateIds = [...new Set(templates.map((t) => t.id))]

  const { data: relRows, error: relErr } = await supabase
    .from("template_process_types")
    .select("process_type_id")
    .in("template_id", templateIds)

  if (relErr) throw relErr

  const typeIdSet = new Set<string>()
  for (const t of templates) {
    if (t.processTypeId) typeIdSet.add(t.processTypeId)
  }
  for (const row of relRows || []) {
    const pid = row.process_type_id as string | undefined
    if (pid) typeIdSet.add(pid)
  }

  const allTypes = await getProcessTypes()
  return allTypes.filter((pt) => typeIdSet.has(pt.id))
}

export async function createProcessType(data: { name: string; description: string }) {
  const supabase = createBrowserClient()

  const { data: newProcessType, error } = await supabase
    .from("process_types")
    .insert({
      name: data.name,
      description: data.description,
    })
    .select()
    .single()

  if (error) throw error
  return newProcessType as ProcessType
}

export async function updateProcessType(id: string, data: Partial<{ name: string; description: string }>) {
  const supabase = createBrowserClient()

  const { data: updatedProcessType, error } = await supabase
    .from("process_types")
    .update(data)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return updatedProcessType as ProcessType
}

export async function deleteProcessType(id: string) {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("process_types").delete().eq("id", id)

  if (error) throw error
}

// Templates
const TEMPLATE_LIST_SELECT = "*, entity:entities(name)"

function filterTemplatesByEntityScope(templates: Template[], entityId?: string | null): Template[] {
  const id = typeof entityId === "string" ? entityId.trim() : ""
  if (!id) return templates
  return templates.filter((t) => !t.entityId || t.entityId === id)
}

export async function getTemplates(processTypeId?: string, entityId?: string | null) {
  const supabase = createBrowserClient()

  const shouldFilterEntity = typeof entityId === "string" && entityId.trim().length > 0
  const entityScope = shouldFilterEntity ? entityId!.trim() : ""

  console.log("[getTemplates] Called with", { processTypeId, entityId, shouldFilterEntity })

  if (processTypeId) {
    const { data: relationData, error: relationError } = await supabase
      .from("template_process_types")
      .select("template_id, created_at")
      .eq("process_type_id", processTypeId)
      .order("created_at", { ascending: true })

    if (relationError) {
      console.error("[getTemplates] Error querying template_process_types:", relationError)
      throw relationError
    }

    const templateIds: string[] = []
    const seenIds = new Set<string>()
    for (const row of relationData || []) {
      if (row.template_id && !seenIds.has(row.template_id)) {
        seenIds.add(row.template_id)
        templateIds.push(row.template_id)
      }
    }

    if (templateIds.length === 0) {
      console.log("[getTemplates] No relations found, falling back to direct process_type_id lookup")
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("templates")
        .select(TEMPLATE_LIST_SELECT)
        .eq("process_type_id", processTypeId)
        .order("created_at", { ascending: true })

      if (fallbackError) {
        console.error("[getTemplates] Error in fallback query:", fallbackError)
        throw fallbackError
      }

      if (fallbackData && fallbackData.length > 0) {
        const relationsToCreate = fallbackData.map((t) => ({
          template_id: t.id,
          process_type_id: processTypeId,
        }))

        const { error: insertError } = await supabase
          .from("template_process_types")
          .upsert(relationsToCreate, { onConflict: "template_id,process_type_id", ignoreDuplicates: true })

        if (insertError) {
          console.error("[getTemplates] Error creating relations (non-critical):", insertError)
        }
      }

      const mapped = (fallbackData || []).map((t) => mapDbTemplateRow(t as Record<string, unknown>))
      return filterTemplatesByEntityScope(mapped, shouldFilterEntity ? entityScope : undefined)
    }

    const { data, error } = await supabase.from("templates").select(TEMPLATE_LIST_SELECT).in("id", templateIds)

    if (error) {
      console.error("[getTemplates] Error fetching templates:", error)
      throw error
    }

    const orderIndex = new Map(templateIds.map((id, i) => [id, i]))
    const sorted = [...(data || [])].sort((a, b) => {
      const ia = orderIndex.get(a.id) ?? 999999
      const ib = orderIndex.get(b.id) ?? 999999
      return ia - ib
    })

    const mapped = sorted.map((t) => mapDbTemplateRow(t as Record<string, unknown>))
    return filterTemplatesByEntityScope(mapped, shouldFilterEntity ? entityScope : undefined)
  }

  const { data, error } = await supabase
    .from("templates")
    .select(TEMPLATE_LIST_SELECT)
    .order("created_at", { ascending: true })
  if (error) throw error

  const mapped = (data || []).map((t) => mapDbTemplateRow(t as Record<string, unknown>))
  return filterTemplatesByEntityScope(mapped, shouldFilterEntity ? entityScope : undefined)
}

export async function createTemplate(data: {
  name: string
  processTypeId: string
  entityId: string
  fileUrl: string
  description?: string
  variables?: string[]
}) {
  const supabase = createBrowserClient()

  if (!data.entityId?.trim()) {
    throw new Error("Debe seleccionar una entidad para la plantilla")
  }

  const { data: newTemplate, error } = await supabase
    .from("templates")
    .insert({
      name: data.name,
      process_type_id: data.processTypeId,
      entity_id: data.entityId.trim(),
      file_url: data.fileUrl,
      variables: data.variables || [],
    })
    .select(TEMPLATE_LIST_SELECT)
    .single()

  if (error) throw error

  const { error: relationError } = await supabase.from("template_process_types").insert({
    template_id: newTemplate.id,
    process_type_id: data.processTypeId,
  })

  if (relationError) {
    console.error("[createTemplate] Error creating relation (non-critical):", relationError)
  }

  return mapDbTemplateRow(newTemplate as Record<string, unknown>)
}

export async function updateTemplate(
  id: string,
  data: Partial<{
    name: string
    processTypeId: string
    entityId: string | null
    fileUrl: string
    variables?: string[]
  }>,
) {
  const supabase = createBrowserClient()

  const updateData: Record<string, unknown> = {}
  if (data.name) updateData.name = data.name
  if (data.processTypeId) updateData.process_type_id = data.processTypeId
  if (data.fileUrl) updateData.file_url = data.fileUrl
  if (data.variables !== undefined) updateData.variables = data.variables
  if (data.entityId !== undefined) {
    updateData.entity_id = data.entityId === null || data.entityId === "" ? null : data.entityId.trim()
  }

  const { data: updatedTemplate, error } = await supabase
    .from("templates")
    .update(updateData)
    .eq("id", id)
    .select(TEMPLATE_LIST_SELECT)
    .single()

  if (error) throw error

  return mapDbTemplateRow(updatedTemplate as Record<string, unknown>)
}

/**
 * Associate a template with a process type (many-to-many relationship)
 * This allows a template to be associated with multiple process types
 */
export async function associateTemplateWithProcessType(templateId: string, processTypeId: string) {
  const supabase = createBrowserClient()

  // Check if association already exists
  const { data: existing } = await supabase
    .from("template_process_types")
    .select("id")
    .eq("template_id", templateId)
    .eq("process_type_id", processTypeId)
    .single()

  if (existing) {
    // Association already exists, no need to create
    return
  }

  // Create the association
  const { error } = await supabase.from("template_process_types").insert({
    template_id: templateId,
    process_type_id: processTypeId,
  })

  if (error) throw error
}

/**
 * Remove association between a template and a process type
 */
export async function removeTemplateProcessTypeAssociation(templateId: string, processTypeId: string) {
  const supabase = createBrowserClient()

  const { error } = await supabase
    .from("template_process_types")
    .delete()
    .eq("template_id", templateId)
    .eq("process_type_id", processTypeId)

  if (error) throw error
}

/**
 * Get all process type IDs associated with a template
 */
export async function getTemplateProcessTypes(templateId: string): Promise<string[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("template_process_types")
    .select("process_type_id")
    .eq("template_id", templateId)

  if (error) throw error

  return (data || []).map((row) => row.process_type_id)
}

export async function deleteTemplate(id: string) {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("templates").delete().eq("id", id)

  if (error) throw error
}

// Processes
export async function getProcesses(filters?: {
  entityId?: string
  status?: string
  processTypeId?: string
}) {
  const supabase = createBrowserClient()

  let query = supabase
    .from("processes")
    .select(`
      *,
      entity:entities(*),
      secretary:secretaries(*),
      process_type:process_types(*)
    `)
    .order("updated_at", { ascending: false })

  if (filters?.entityId) {
    query = query.eq("entity_id", filters.entityId)
  }
  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.processTypeId) {
    query = query.eq("process_type_id", filters.processTypeId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as ProcessWithRelations[]
}

export async function getProcessesMapped(filters?: {
  entityId?: string
  status?: string
  processTypeId?: string
}): Promise<ProcessMapped[]> {
  const supabase = createBrowserClient()

  let query = supabase
    .from("processes")
    .select(`
      *,
      entity:entities(id, name),
      secretary:secretaries(id, name),
      process_type:process_types(id, name)
    `)
    .order("updated_at", { ascending: false })

  if (filters?.entityId) {
    query = query.eq("entity_id", filters.entityId)
  }
  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.processTypeId) {
    query = query.eq("process_type_id", filters.processTypeId)
  }

  const { data, error } = await query
  if (error) throw error

  // Get document counts for each process
  const processIds = (data || []).map((p) => p.id)
  let documentCounts: Record<string, number> = {}

  if (processIds.length > 0) {
    const docs = await documentsProcessIdsInChunks(supabase, processIds)
    documentCounts = docs.reduce(
      (acc, d) => {
        acc[d.process_id] = (acc[d.process_id] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }

  return (data || []).map((p) => ({
    id: p.id,
    code: p.code || "",
    object: p.object || "",
    description: p.description || "",
    status: p.status as Process["status"],
    entityId: p.entity_id,
    entityName: p.entity?.name || "",
    secretaryId: p.secretary_id,
    secretaryName: p.secretary?.name || "",
    processTypeId: p.process_type_id,
    processTypeName: p.process_type?.name || "",
    createdAt: p.created_at?.split("T")[0] || "",
    updatedAt: p.updated_at?.split("T")[0] || "",
    documentsCount: documentCounts[p.id] || 0,
    currentVersion: p.current_version || 1,
    spreadsheetId: (p as any).spreadsheet_id || null,
    spreadsheetUrl: (p as any).spreadsheet_url || null,
    driveFolderId: (p as any).drive_folder_id || null,
    driveFolderUrl: (p as any).drive_folder_url || null,
  }))
}

export async function createProcess(data: {
  code: string
  object: string
  description: string
  entityId: string
  secretaryId: string
  processTypeId: string
  status?: string
  createdBy?: string
}): Promise<Process> {
  const supabase = createBrowserClient()

  const { data: newProcess, error } = await supabase
    .from("processes")
    .insert({
      code: data.code,
      object: data.object,
      description: data.description,
      entity_id: data.entityId,
      secretary_id: data.secretaryId,
      process_type_id: data.processTypeId,
      status: data.status || "draft",
      created_by: data.createdBy,
      current_version: 1,
    })
    .select(`
      *,
      entity:entities(id, name),
      secretary:secretaries(id, name),
      process_type:process_types(id, name)
    `)
    .single()

  if (error) throw error

  return {
    id: newProcess.id,
    code: newProcess.code || "",
    object: newProcess.object || "",
    description: newProcess.description || "",
    status: newProcess.status as Process["status"],
    entityId: newProcess.entity_id,
    entityName: newProcess.entity?.name || "",
    secretaryId: newProcess.secretary_id,
    secretaryName: newProcess.secretary?.name || "",
    processTypeId: newProcess.process_type_id,
    processTypeName: newProcess.process_type?.name || "",
    createdAt: newProcess.created_at?.split("T")[0] || "",
    updatedAt: newProcess.updated_at?.split("T")[0] || "",
    documentsCount: 0,
    currentVersion: newProcess.current_version || 1,
  }
}

export async function updateProcess(
  id: string,
  data: Partial<{
    code: string
    object: string
    description: string
    status: string
    currentVersion: number
  }>,
): Promise<Process> {
  const supabase = createBrowserClient()

  const updateData: Record<string, unknown> = {}
  if (data.code !== undefined) updateData.code = data.code
  if (data.object !== undefined) updateData.object = data.object
  if (data.description !== undefined) updateData.description = data.description
  if (data.status !== undefined) updateData.status = data.status
  if (data.currentVersion !== undefined) updateData.current_version = data.currentVersion

  const { data: updatedProcess, error } = await supabase
    .from("processes")
    .update(updateData)
    .eq("id", id)
    .select(`
      *,
      entity:entities(id, name),
      secretary:secretaries(id, name),
      process_type:process_types(id, name)
    `)
    .single()

  if (error) throw error

  return {
    id: updatedProcess.id,
    code: updatedProcess.code || "",
    object: updatedProcess.object || "",
    description: updatedProcess.description || "",
    status: updatedProcess.status as Process["status"],
    entityId: updatedProcess.entity_id,
    entityName: updatedProcess.entity?.name || "",
    secretaryId: updatedProcess.secretary_id,
    secretaryName: updatedProcess.secretary?.name || "",
    processTypeId: updatedProcess.process_type_id,
    processTypeName: updatedProcess.process_type?.name || "",
    createdAt: updatedProcess.created_at?.split("T")[0] || "",
    updatedAt: updatedProcess.updated_at?.split("T")[0] || "",
    documentsCount: 0,
    currentVersion: updatedProcess.current_version || 1,
  }
}

export async function deleteProcess(id: string) {
  const supabase = createBrowserClient()

  // First delete related documents
  await supabase.from("documents").delete().eq("process_id", id)

  const { error } = await supabase.from("processes").delete().eq("id", id)

  if (error) throw error
}

export async function generateProcessCode(processTypeId: string): Promise<string> {
  const supabase = createBrowserClient()

  // Get process type abbreviation
  const { data: processType } = await supabase.from("process_types").select("name").eq("id", processTypeId).single()

  // Create abbreviation from first letters of each word
  const abbrev = (processType?.name || "PR")
    .split(" ")
    .map((word: string) => word[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 3)

  // Get current year
  const year = new Date().getFullYear()

  // Find a unique code by checking if it exists
  let sequence = 1
  let code = ""
  let maxAttempts = 1000 // Prevent infinite loop
  
  while (maxAttempts > 0) {
    const sequenceStr = String(sequence).padStart(3, "0")
    code = `${abbrev}-${year}-${sequenceStr}`
    
    // Check if this code already exists (.maybeSingle() avoids 406 when no row)
    const { data: existing } = await supabase
      .from("processes")
      .select("id")
      .eq("code", code)
      .maybeSingle()

    // If code doesn't exist, we can use it
    if (!existing) {
      return code
    }
    
    // Otherwise, try next sequence number
    sequence++
    maxAttempts--
  }
  
  // Fallback: use timestamp if we can't find a unique code
  const timestamp = Date.now().toString().slice(-6)
  return `${abbrev}-${year}-${timestamp}`
}

export async function getProcess(id: string) {
  const supabase = createBrowserClient()
  const { data, error } = await supabase
    .from("processes")
    .select(`
      *,
      entity:entities(*),
      secretary:secretaries(*),
      process_type:process_types(*)
    `)
    .eq("id", id)
    .single()

  if (error) throw error
  return data as ProcessWithRelations
}

export async function getProcessMapped(id: string): Promise<ProcessMapped | null> {
  const supabase = createBrowserClient()
  const { data: p, error } = await supabase
    .from("processes")
    .select(`
      *,
      entity:entities(id, name),
      secretary:secretaries(id, name),
      process_type:process_types(id, name)
    `)
    .eq("id", id)
    .single()

  if (error || !p) return null
  const { count } = await supabase.from("documents").select("*", { count: "exact", head: true }).eq("process_id", id)
  return {
    id: p.id,
    code: p.code || "",
    object: p.object || "",
    description: p.description || "",
    status: p.status as ProcessMapped["status"],
    entityId: p.entity_id,
    entityName: (p as any).entity?.name || "",
    secretaryId: p.secretary_id,
    secretaryName: (p as any).secretary?.name || "",
    processTypeId: p.process_type_id,
    processTypeName: (p as any).process_type?.name || "",
    createdAt: p.created_at?.split("T")[0] || "",
    updatedAt: p.updated_at?.split("T")[0] || "",
    documentsCount: count ?? 0,
    currentVersion: p.current_version || 1,
    spreadsheetId: (p as any).spreadsheet_id ?? null,
    spreadsheetUrl: (p as any).spreadsheet_url ?? null,
    driveFolderId: (p as any).drive_folder_id ?? null,
    driveFolderUrl: (p as any).drive_folder_url ?? null,
  }
}

// Documents
export async function getDocuments(filters?: {
  processId?: string
  status?: string
  type?: string
}) {
  const supabase = createBrowserClient()

  let query = supabase
    .from("documents")
    .select(`
      *,
      process:processes(
        *,
        entity:entities(*)
      )
    `)
    .order("updated_at", { ascending: false })

  if (filters?.processId) {
    query = query.eq("process_id", filters.processId)
  }
  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.type) {
    query = query.eq("type", filters.type)
  }

  const { data, error } = await query
  if (error) throw error
  return data as DocumentWithRelations[]
}

// Dashboard Stats
export async function getDashboardStats() {
  const supabase = createBrowserClient()

  // Get process counts by status
  const { data: processes } = await supabase.from("processes").select("status")

  const statusCounts = (processes || []).reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Get documents count
  const { count: documentsCount } = await supabase.from("documents").select("*", { count: "exact", head: true })

  // Get entities count
  const { count: entitiesCount } = await supabase.from("entities").select("*", { count: "exact", head: true })

  return {
    totalProcesses: processes?.length || 0,
    activeProcesses: (statusCounts["in_progress"] || 0) + (statusCounts["review"] || 0),
    completedProcesses: statusCounts["completed"] || 0,
    draftProcesses: statusCounts["draft"] || 0,
    documentsGenerated: documentsCount || 0,
    entitiesManaged: entitiesCount || 0,
  }
}

// Profiles
export async function getCurrentProfile() {
  const supabase = createBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (error) return null
  return data as Profile
}

export async function getOrganizationMembers(organizationId: string) {
  // Use API route to get members (bypasses RLS using service role)
  const response = await fetch(`/api/get-organization-members?organizationId=${encodeURIComponent(organizationId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error("[getOrganizationMembers] Error fetching members:", errorData)
    throw new Error(errorData.message || errorData.error || "Failed to fetch members")
  }

  const result = await response.json()
  const members = result.members || []

  console.log(`[getOrganizationMembers] Found ${members.length} members for organization ${organizationId}`)
  console.log(`[getOrganizationMembers] Raw data:`, members)
  console.log(`[getOrganizationMembers] Admin count:`, members.filter((m: any) => m.role === "admin").length)
  console.log(`[getOrganizationMembers] Member roles:`, members.map((m: any) => ({ name: m.name, role: m.role, email: m.email })))
  
  return members as Profile[]
}

export async function createMember(data: {
  email: string
  name: string
  role: "admin" | "member"
  organizationId: string
  avatarUrl?: string
  isInvitation?: boolean
  entityIds?: string[]
}) {
  // Use API route to create member (bypasses RLS using service role)
  const response = await fetch("/api/create-member", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || errorData.error || "Failed to create member")
  }

  const result = await response.json()
  return result.profile as Profile
}

export async function updateMember(
  id: string,
  data: Partial<{
    name: string
    role: string
    avatarUrl: string
  }>,
) {
  // Use API route to update member (bypasses RLS using service role)
  const response = await fetch("/api/update-member", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      memberId: id,
      ...data,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || errorData.error || "Failed to update member")
  }

  const result = await response.json()
  return result.profile as Profile
}

export async function deleteMember(id: string) {
  // Use API route to delete member (bypasses RLS using service role)
  const response = await fetch(`/api/delete-member?memberId=${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || errorData.error || "Failed to delete member")
  }

  const result = await response.json()
  return result
}

export async function assignExistingMember(data: {
  userId: string
  role: "admin" | "member"
  organizationId: string
}) {
  const supabase = createBrowserClient()

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update({
      role: data.role,
      organization_id: data.organizationId,
    })
    .eq("id", data.userId)
    .select()
    .single()

  if (error) throw error
  return updatedProfile as Profile
}

export async function searchUserByEmail(email: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase.from("profiles").select("*").eq("email", email).single()

  if (error && error.code !== "PGRST116") throw error
  return data as Profile | null
}

// Users without Organization
export async function getUsersWithoutOrganization() {
  const supabase = createBrowserClient()

  const { data, error } = await supabase.from("profiles").select("*").is("organization_id", null).order("full_name")

  if (error) throw error
  return data as Profile[]
}

export async function getMemberAssignedEntities(memberId: string): Promise<string[]> {
  // Use API route to get member entity assignments (bypasses RLS using service role)
  const response = await fetch(`/api/get-member-entities?memberId=${encodeURIComponent(memberId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || errorData.error || "Failed to get member entities")
  }

  const result = await response.json()
  return result.entityIds || []
}

export async function assignMemberEntities(memberId: string, entityIds: string[]): Promise<void> {
  // Use API route to assign entities to member (bypasses RLS using service role)
  const response = await fetch("/api/assign-member-entities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      memberId,
      entityIds,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || errorData.error || "Failed to assign entities")
  }
}
