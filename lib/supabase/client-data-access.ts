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

// Export ProcessMapped type
export type { ProcessMapped }

// Client-side Template type (with camelCase fields matching the mapped return values)
export interface Template {
  id: string
  name: string
  processTypeId: string
  fileUrl: string
  variables?: string[]
  createdAt: string
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
 
  console.log("organization_id", organizationId)
  

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
  console.log("secretaries", entityId)
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
    variables: t.variables || [],
    createdAt: t.created_at?.split("T")[0] || "",
  })) as Template[]
}

export async function createTemplate(data: {
  name: string
  processTypeId: string
  fileUrl: string
  description?: string
  variables?: string[]
}) {
  const supabase = createBrowserClient()

  const { data: newTemplate, error } = await supabase
    .from("templates")
    .insert({
      name: data.name,
      process_type_id: data.processTypeId,
      file_url: data.fileUrl,
      variables: data.variables || [],
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: newTemplate.id,
    name: newTemplate.name,
    processTypeId: newTemplate.process_type_id,
    fileUrl: newTemplate.file_url,
    variables: newTemplate.variables || [],
    createdAt: newTemplate.created_at?.split("T")[0] || "",
  } as Template
}

export async function updateTemplate(
  id: string,
  data: Partial<{
    name: string
    processTypeId: string
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
    variables: updatedTemplate.variables || [],
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
    const { data: docs } = await supabase.from("documents").select("process_id").in("process_id", processIds)

    documentCounts = (docs || []).reduce(
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

  // Count existing processes of this type this year
  const { count } = await supabase
    .from("processes")
    .select("*", { count: "exact", head: true })
    .eq("process_type_id", processTypeId)
    .gte("created_at", `${year}-01-01`)

  const sequence = String((count || 0) + 1).padStart(3, "0")

  return `${abbrev}-${year}-${sequence}`
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

export async function getOrganizationMembers(organizationId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name")

  if (error) throw error
  return data as Profile[]
}

export async function createMember(data: {
  email: string
  name: string
  role: "admin" | "member"
  organizationId: string
  avatarUrl?: string
}) {
  const supabase = createBrowserClient()

  // First, create the auth user by sending an invite
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    email_confirm: true,
    user_metadata: {
      name: data.name,
      role: data.role,
    },
  })

  // If admin API is not available, we'll create profile directly
  // The user will need to sign up separately
  if (authError) {
    console.log("[v0] Admin API not available, creating profile only")
  }

  const userId = authData?.user?.id || crypto.randomUUID()

  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email: data.email,
      name: data.name,
      role: data.role,
      organization_id: data.organizationId,
      avatar_url: data.avatarUrl,
    })
    .select()
    .single()

  if (error) throw error
  return newProfile as Profile
}

export async function updateMember(
  id: string,
  data: Partial<{
    name: string
    role: string
    avatarUrl: string
  }>,
) {
  const supabase = createBrowserClient()

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.role !== undefined) updateData.role = data.role
  if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return updatedProfile as Profile
}

export async function deleteMember(id: string) {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("profiles").delete().eq("id", id)

  if (error) throw error
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
