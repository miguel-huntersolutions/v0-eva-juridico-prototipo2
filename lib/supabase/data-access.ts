// Data Access Layer for Supabase
import { createServerClient } from "./server"

// Types matching database schema
export interface Organization {
  id: string
  name: string
  nit: string
  status: "active" | "inactive"
  created_at: string
  updated_at: string
  // Computed fields
  members_count?: number
  entities_count?: number
}

export interface Entity {
  id: string
  name: string
  nit: string
  representative_name: string
  organization_id: string
  logo_url: string | null
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export interface Secretary {
  id: string
  name: string
  secretary_name: string
  email: string
  phone: string
  entity_id: string
  created_at: string
  updated_at: string
}

export interface ProcessType {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface Template {
  id: string
  name: string
  process_type_id: string
  file_url: string
  /** Si está definida, la plantilla solo aplica a procesos de esta entidad; null = todas. */
  entity_id?: string | null
  variables?: string[] | null
  created_at: string
  updated_at: string
}

export interface Process {
  id: string
  code: string
  object: string
  description: string
  status: "draft" | "in_progress" | "review" | "completed" | "archived"
  entity_id: string
  secretary_id: string
  process_type_id: string
  current_version: number
  created_by: string | null
  spreadsheet_id?: string | null
  spreadsheet_url?: string | null
  drive_folder_id?: string | null
  drive_folder_url?: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  process_id: string
  name: string
  type: string
  version: number
  status: "draft" | "pending" | "in_review" | "approved" | "rejected"
  file_url: string
  file_size: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  name: string
  email: string
  role: "superadmin" | "admin" | "member"
  status: "pending" | "approved" | "rejected"
  organization_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// Extended types with joined data
export interface ProcessWithRelations extends Process {
  entity?: Entity
  secretary?: Secretary
  process_type?: ProcessType
  documents_count?: number
}

export interface DocumentWithRelations extends Document {
  process?: Process & {
    entity?: Entity
  }
}

// Organizations
export async function getOrganizations() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("organizations").select("*").order("name")

  if (error) throw error
  return data as Organization[]
}

export async function getOrganization(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("organizations").select("*").eq("id", id).single()

  if (error) throw error
  return data as Organization
}

export async function getOrganizationStats(organizationId: string) {
  const supabase = await createServerClient()

  // Get entities count
  const { count: entitiesCount } = await supabase
    .from("entities")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)

  // Get members count
  const { count: membersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)

  return {
    entitiesCount: entitiesCount || 0,
    membersCount: membersCount || 0,
  }
}

// Entities
export async function getEntities(organizationId?: string) {
  const supabase = await createServerClient()
  let query = supabase.from("entities").select("*").order("name")

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Entity[]
}

export async function getEntity(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("entities").select("*").eq("id", id).single()

  if (error) throw error
  return data as Entity
}

export async function getEntityWithStats(id: string) {
  const supabase = await createServerClient()

  const { data: entity, error } = await supabase.from("entities").select("*").eq("id", id).single()

  if (error) throw error

  const { count: processesCount } = await supabase
    .from("processes")
    .select("*", { count: "exact", head: true })
    .eq("entity_id", id)

  return {
    ...entity,
    processesCount: processesCount || 0,
  } as Entity & { processesCount: number }
}

// Secretaries
export async function getSecretaries(entityId?: string) {
  const supabase = await createServerClient()
  let query = supabase.from("secretaries").select("*").order("name")

  if (entityId) {
    query = query.eq("entity_id", entityId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Secretary[]
}

export async function getSecretary(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("secretaries").select("*").eq("id", id).single()

  if (error) throw error
  return data as Secretary
}

// Process Types
export async function getProcessTypes() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("process_types").select("*").order("name")

  if (error) throw error
  return data as ProcessType[]
}

export async function getProcessType(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("process_types").select("*").eq("id", id).single()

  if (error) throw error
  return data as ProcessType
}

// Templates
export async function getTemplates(processTypeId?: string) {
  const supabase = await createServerClient()
  let query = supabase.from("templates").select("*").order("created_at", { ascending: true })

  if (processTypeId) {
    query = query.eq("process_type_id", processTypeId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Template[]
}

export async function getTemplatesWithProcessType() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("templates")
    .select(`
      *,
      process_type:process_types(*)
    `)
    .order("name")

  if (error) throw error
  return data as (Template & { process_type: ProcessType })[]
}

export async function getTemplateById(templateId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .single()
  if (error) throw error
  return data as Template
}

// Processes
export async function getProcesses(filters?: {
  entityId?: string
  status?: string
  processTypeId?: string
  organizationId?: string
}) {
  const supabase = await createServerClient()

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

  // Get documents count for each process
  const processesWithCount = await Promise.all(
    (data || []).map(async (process) => {
      const { count } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("process_id", process.id)

      return {
        ...process,
        documents_count: count || 0,
      }
    }),
  )

  return processesWithCount as ProcessWithRelations[]
}

export async function getProcess(id: string) {
  const supabase = await createServerClient()
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

export async function createProcess(process: Omit<Process, "id" | "created_at" | "updated_at">) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("processes").insert(process).select().single()

  if (error) throw error
  return data as Process
}

export async function updateProcess(id: string, updates: Partial<Process>) {
  const supabase = await createServerClient()
  console.log("[updateProcess] Updating process:", { id, updates })
  const { data, error } = await supabase
    .from("processes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[updateProcess] Error updating process:", error)
    throw error
  }
  console.log("[updateProcess] Process updated successfully:", data)
  return data as Process
}

// Documents
export async function getDocuments(filters?: {
  processId?: string
  entityId?: string
  status?: string
  type?: string
}) {
  const supabase = await createServerClient()

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

export async function getDocument(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("documents")
    .select(`
      *,
      process:processes(
        *,
        entity:entities(*)
      )
    `)
    .eq("id", id)
    .single()

  if (error) throw error
  return data as DocumentWithRelations
}

export async function createDocument(document: Omit<Document, "id" | "created_at" | "updated_at">) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("documents").insert(document).select().single()

  if (error) throw error
  return data as Document
}

export async function updateDocument(id: string, updates: Partial<Document>) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("documents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Document
}

// Dashboard Stats
export async function getDashboardStats(organizationId?: string) {
  const supabase = await createServerClient()

  // Get process counts by status
  let processQuery = supabase.from("processes").select("status")

  if (organizationId) {
    // Filter by entities in the organization
    const { data: entities } = await supabase.from("entities").select("id").eq("organization_id", organizationId)

    const entityIds = entities?.map((e) => e.id) || []
    if (entityIds.length > 0) {
      processQuery = processQuery.in("entity_id", entityIds)
    }
  }

  const { data: processes } = await processQuery

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
  let entitiesQuery = supabase.from("entities").select("*", { count: "exact", head: true })
  if (organizationId) {
    entitiesQuery = entitiesQuery.eq("organization_id", organizationId)
  }
  const { count: entitiesCount } = await entitiesQuery

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
export async function getProfile(userId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error) throw error
  return data as Profile
}

export async function getProfiles(organizationId?: string) {
  const supabase = await createServerClient()
  let query = supabase.from("profiles").select("*").order("name")

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Profile[]
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}
