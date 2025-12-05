// Client-side Data Access Layer for Supabase
import { createBrowserClient } from "./client"
import type {
  Organization,
  Entity,
  Secretary,
  ProcessType,
  Template,
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
  Template,
  Process,
  Document,
  Profile,
  ProcessWithRelations,
  DocumentWithRelations,
}

// Organizations
export async function getOrganizations() {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from("organizations").select("*").order("name")

  if (error) throw error
  return data as Organization[]
}

export async function createOrganization(data: {
  name: string
  nit: string
  status?: string
}) {
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
  return newOrg as Organization
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
export async function getEntities(organizationId?: string) {
  const supabase = createBrowserClient()
  let query = supabase.from("entities").select("*").order("name")

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((e) => ({
    id: e.id,
    name: e.name,
    nit: e.nit,
    representativeName: e.representative_name,
    organizationId: e.organization_id,
    logoUrl: e.logo_url,
    status: e.status,
    processesCount: 0, // Will be calculated separately if needed
  })) as Entity[]
}

export async function createEntity(data: {
  name: string
  nit: string
  representativeName: string
  organizationId: string
  logoUrl?: string
  status?: string
}) {
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

  return {
    id: newEntity.id,
    name: newEntity.name,
    nit: newEntity.nit,
    representativeName: newEntity.representative_name,
    organizationId: newEntity.organization_id,
    logoUrl: newEntity.logo_url,
    status: newEntity.status,
    processesCount: 0,
  } as Entity
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
) {
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

  return {
    id: updatedEntity.id,
    name: updatedEntity.name,
    nit: updatedEntity.nit,
    representativeName: updatedEntity.representative_name,
    organizationId: updatedEntity.organization_id,
    logoUrl: updatedEntity.logo_url,
    status: updatedEntity.status,
    processesCount: 0,
  } as Entity
}

export async function deleteEntity(id: string) {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("entities").delete().eq("id", id)

  if (error) throw error
}

// Secretaries
export async function getSecretaries(entityId?: string) {
  const supabase = createBrowserClient()
  let query = supabase.from("secretaries").select("*").order("name")

  if (entityId) {
    query = query.eq("entity_id", entityId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Secretary[]
}

// Process Types
export async function getProcessTypes() {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from("process_types").select("*").order("name")

  if (error) throw error
  return data as ProcessType[]
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
export async function getTemplates(processTypeId?: string) {
  const supabase = createBrowserClient()
  let query = supabase.from("templates").select("*").order("name")

  if (processTypeId) {
    query = query.eq("process_type_id", processTypeId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((t) => ({
    id: t.id,
    name: t.name,
    processTypeId: t.process_type_id,
    fileUrl: t.file_url,
    createdAt: t.created_at?.split("T")[0] || "",
  })) as Template[]
}

export async function createTemplate(data: {
  name: string
  processTypeId: string
  fileUrl: string
}) {
  const supabase = createBrowserClient()

  const { data: newTemplate, error } = await supabase
    .from("templates")
    .insert({
      name: data.name,
      process_type_id: data.processTypeId,
      file_url: data.fileUrl,
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: newTemplate.id,
    name: newTemplate.name,
    processTypeId: newTemplate.process_type_id,
    fileUrl: newTemplate.file_url,
    createdAt: newTemplate.created_at?.split("T")[0] || "",
  } as Template
}

export async function updateTemplate(
  id: string,
  data: Partial<{
    name: string
    processTypeId: string
    fileUrl: string
  }>,
) {
  const supabase = createBrowserClient()

  const updateData: Record<string, unknown> = {}
  if (data.name) updateData.name = data.name
  if (data.processTypeId) updateData.process_type_id = data.processTypeId
  if (data.fileUrl) updateData.file_url = data.fileUrl

  const { data: updatedTemplate, error } = await supabase
    .from("templates")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error

  return {
    id: updatedTemplate.id,
    name: updatedTemplate.name,
    processTypeId: updatedTemplate.process_type_id,
    fileUrl: updatedTemplate.file_url,
    createdAt: updatedTemplate.created_at?.split("T")[0] || "",
  } as Template
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
