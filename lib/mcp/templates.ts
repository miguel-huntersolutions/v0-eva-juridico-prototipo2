import { getMcpServiceClient } from "./service-client"

export type McpTemplate = {
  id: string
  name: string
  fileUrl: string
  variables: string[] | null
  processTypeId: string | null
  entityId: string | null
}

const TEMPLATE_SELECT = "id, name, file_url, variables, process_type_id, entity_id, created_at"

export async function getTemplatesForMcp(
  processTypeId: string,
  entityId: string,
): Promise<McpTemplate[]> {
  const supabase = getMcpServiceClient()

  const { data: relationData } = await supabase
    .from("template_process_types")
    .select("template_id, created_at")
    .eq("process_type_id", processTypeId)
    .order("created_at", { ascending: true })

  let templateIds: string[] = []
  const seen = new Set<string>()
  for (const row of relationData || []) {
    if (row.template_id && !seen.has(row.template_id)) {
      seen.add(row.template_id)
      templateIds.push(row.template_id)
    }
  }

  let rows: Array<Record<string, unknown>> = []

  if (templateIds.length > 0) {
    const { data, error } = await supabase.from("templates").select(TEMPLATE_SELECT).in("id", templateIds)
    if (error) throw error
    rows = data || []
    const order = new Map(templateIds.map((id, i) => [id, i]))
    rows.sort((a, b) => (order.get(a.id as string) ?? 0) - (order.get(b.id as string) ?? 0))
  } else {
    const { data, error } = await supabase
      .from("templates")
      .select(TEMPLATE_SELECT)
      .eq("process_type_id", processTypeId)
      .order("created_at", { ascending: true })
    if (error) throw error
    rows = data || []
  }

  const mapped = rows.map((t) => ({
    id: t.id as string,
    name: t.name as string,
    fileUrl: (t.file_url as string) || "",
    variables: (t.variables as string[] | null) || null,
    processTypeId: (t.process_type_id as string | null) || null,
    entityId: (t.entity_id as string | null) || null,
  }))

  return mapped.filter((t) => !t.entityId || t.entityId === entityId)
}

/** All templates visible for an entity (any process type). */
export async function getTemplatesForMcpEntity(entityId: string): Promise<McpTemplate[]> {
  const supabase = getMcpServiceClient()
  const { data, error } = await supabase.from("templates").select(TEMPLATE_SELECT).order("created_at", {
    ascending: true,
  })
  if (error) throw error
  const rows = data || []
  return rows
    .map((t) => ({
      id: t.id as string,
      name: t.name as string,
      fileUrl: (t.file_url as string) || "",
      variables: (t.variables as string[] | null) || null,
      processTypeId: (t.process_type_id as string | null) || null,
      entityId: (t.entity_id as string | null) || null,
    }))
    .filter((t) => !t.entityId || t.entityId === entityId)
}
