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

// Entities
export async function getEntities(organizationId?: string) {
  const supabase = createBrowserClient()
  let query = supabase.from("entities").select("*").order("name")

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Entity[]
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

// Templates
export async function getTemplates(processTypeId?: string) {
  const supabase = createBrowserClient()
  let query = supabase.from("templates").select("*").order("name")

  if (processTypeId) {
    query = query.eq("process_type_id", processTypeId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Template[]
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
