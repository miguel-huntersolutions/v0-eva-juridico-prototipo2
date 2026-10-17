import { getMcpServiceClient } from "./service-client"

export async function generateProcessCodeServer(processTypeId: string): Promise<string> {
  const supabase = getMcpServiceClient()
  const { data: processType } = await supabase.from("process_types").select("name").eq("id", processTypeId).single()

  const abbrev = (processType?.name || "PR")
    .split(/\s+/)
    .map((w: string) => w[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 4) || "PR"

  const year = new Date().getFullYear()
  const prefix = `${abbrev}-${year}-`

  const { data: existing } = await supabase
    .from("processes")
    .select("code")
    .like("code", `${prefix}%`)
    .order("code", { ascending: false })
    .limit(1)

  let nextNum = 1
  if (existing?.[0]?.code) {
    const match = existing[0].code.match(/-(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`
}

export async function createProcessServer(params: {
  code: string
  object: string
  description: string
  entityId: string
  secretaryId: string
  processTypeId: string
  createdBy: string
  status?: string
}) {
  const supabase = getMcpServiceClient()
  const { data, error } = await supabase
    .from("processes")
    .insert({
      code: params.code,
      object: params.object,
      description: params.description,
      entity_id: params.entityId,
      secretary_id: params.secretaryId,
      process_type_id: params.processTypeId,
      status: params.status || "in_progress",
      created_by: params.createdBy,
      current_version: 1,
    })
    .select(
      `
      *,
      entity:entities(id, name),
      secretary:secretaries(id, name),
      process_type:process_types(id, name)
    `,
    )
    .single()

  if (error) throw error
  return data
}
