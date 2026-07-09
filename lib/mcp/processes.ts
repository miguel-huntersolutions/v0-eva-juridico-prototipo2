import { getAppUrl } from "@/lib/app-config"
import { assertEntityAccess, getEntitiesForMcpUser } from "./entity-access"
import type { ResolvedMcpUser } from "./resolve-user"
import { getMcpServiceClient } from "./service-client"

export type McpProcessSummary = {
  id: string
  code: string
  object: string | null
  status: string | null
  entityId: string
  entityName: string
  secretaryName: string | null
  processTypeName: string | null
  documentCount: number
  driveFolderUrl: string | null
  spreadsheetUrl: string | null
  portalProcessUrl: string
  createdAt: string | null
  updatedAt: string | null
}

export type McpProcessDocument = {
  id: string
  name: string
  type: string | null
  status: string | null
  webViewLink: string | null
  fileSize: number | null
  createdAt: string | null
}

export type McpProcessDetail = McpProcessSummary & {
  description: string | null
  documents: McpProcessDocument[]
  documentUrls: string[]
}

const PROCESS_SELECT = `
  id,
  code,
  object,
  description,
  status,
  entity_id,
  created_at,
  updated_at,
  drive_folder_url,
  spreadsheet_url,
  entity:entities(id, name),
  secretary:secretaries(id, name),
  process_type:process_types(id, name)
`

function mapProcessRow(
  row: Record<string, unknown>,
  documentCount: number,
): McpProcessSummary {
  const entity = row.entity as { id: string; name: string } | null
  const secretary = row.secretary as { name: string } | null
  const processType = row.process_type as { name: string } | null
  const id = row.id as string

  return {
    id,
    code: row.code as string,
    object: (row.object as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    entityId: row.entity_id as string,
    entityName: entity?.name ?? "",
    secretaryName: secretary?.name ?? null,
    processTypeName: processType?.name ?? null,
    documentCount,
    driveFolderUrl: (row.drive_folder_url as string | null) ?? null,
    spreadsheetUrl: (row.spreadsheet_url as string | null) ?? null,
    portalProcessUrl: `${getAppUrl()}/member/processes/${id}`,
    createdAt: (row.created_at as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
  }
}

async function getAllowedEntityIds(user: ResolvedMcpUser): Promise<string[]> {
  const entities = await getEntitiesForMcpUser(user)
  return entities.map((e) => e.id)
}

export async function listMcpProcesses(
  user: ResolvedMcpUser,
  filters: {
    entityId?: string
    processCode?: string
    limit?: number
  },
): Promise<McpProcessSummary[]> {
  const entityIds = await getAllowedEntityIds(user)
  if (entityIds.length === 0) return []

  if (filters.entityId) {
    const access = await assertEntityAccess(user, filters.entityId)
    if (!access.ok) throw new Error(access.error)
  }

  const scopedEntityIds = filters.entityId ? [filters.entityId] : entityIds
  const supabase = getMcpServiceClient()
  const limit = filters.limit ?? 20

  let query = supabase
    .from("processes")
    .select(PROCESS_SELECT)
    .in("entity_id", scopedEntityIds)
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (filters.processCode?.trim()) {
    query = query.ilike("code", `%${filters.processCode.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  const rows = data || []
  if (rows.length === 0) return []

  const processIds = rows.map((r) => r.id as string)
  const { data: docs } = await supabase
    .from("documents")
    .select("process_id")
    .in("process_id", processIds)

  const counts: Record<string, number> = {}
  for (const d of docs || []) {
    counts[d.process_id] = (counts[d.process_id] || 0) + 1
  }

  return rows.map((row) => mapProcessRow(row as Record<string, unknown>, counts[row.id as string] || 0))
}

export async function assertProcessAccess(
  user: ResolvedMcpUser,
  processId: string,
): Promise<{ ok: true; entityId: string } | { ok: false; error: string }> {
  const supabase = getMcpServiceClient()
  const { data: process, error } = await supabase
    .from("processes")
    .select("id, entity_id")
    .eq("id", processId)
    .maybeSingle()

  if (error || !process) {
    return { ok: false, error: "Proceso no encontrado." }
  }

  const access = await assertEntityAccess(user, process.entity_id)
  if (!access.ok) return access

  return { ok: true, entityId: process.entity_id }
}

export async function getMcpProcessDetail(
  user: ResolvedMcpUser,
  processId: string,
): Promise<McpProcessDetail | null> {
  const access = await assertProcessAccess(user, processId)
  if (!access.ok) throw new Error(access.error)

  const supabase = getMcpServiceClient()
  const { data: row, error } = await supabase
    .from("processes")
    .select(PROCESS_SELECT)
    .eq("id", processId)
    .maybeSingle()

  if (error) throw error
  if (!row) return null

  const { data: docs } = await supabase
    .from("documents")
    .select("id, name, type, status, file_url, file_size, created_at")
    .eq("process_id", processId)
    .order("created_at", { ascending: true })

  const documents: McpProcessDocument[] = (docs || []).map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    status: d.status,
    webViewLink: d.file_url,
    fileSize: d.file_size,
    createdAt: d.created_at,
  }))

  const summary = mapProcessRow(row as Record<string, unknown>, documents.length)
  const documentUrls = [
    ...documents.map((d) => d.webViewLink).filter((u): u is string => !!u),
    ...(summary.driveFolderUrl ? [summary.driveFolderUrl] : []),
    ...(summary.spreadsheetUrl ? [summary.spreadsheetUrl] : []),
  ]

  return {
    ...summary,
    description: (row.description as string | null) ?? null,
    documents,
    documentUrls,
  }
}
