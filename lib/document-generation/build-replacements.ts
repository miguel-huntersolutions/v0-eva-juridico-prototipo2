import { parseDynamicTableTagToken, isImageTag } from "@/lib/utils/template-helpers"
import { getAllUniqueTags } from "@/lib/utils/document-generator"

export function buildReplacementsFromFormState(
  allTags: string[],
  formData: Record<string, string>,
  tableData: Record<string, Array<Record<string, string>>>,
): Record<string, unknown> {
  const replacements: Record<string, unknown> = {}

  Object.entries(formData).forEach(([tag, value]) => {
    const cleanTag = tag.replace(/[{}]/g, "")
    if (isImageTag(cleanTag)) return
    replacements[cleanTag] = value || ""
  })

  for (const tag of allTags) {
    const tableDef = parseDynamicTableTagToken(tag)
    if (!tableDef) continue
    const family = tableDef.loopName.split("@")[0] || tableDef.loopName
    const rows = tableData[family] || []
    replacements[tableDef.loopName] = rows.map((row) => {
      const mappedRow: Record<string, string> = {}
      tableDef.fields.forEach((field) => {
        mappedRow[field] = (row?.[field] || "").trim()
      })
      return mappedRow
    })
  }

  return replacements
}

export function buildReplacementsForTemplates(
  templates: Array<{ variables?: string[] | null }>,
  formData: Record<string, string>,
  tableData: Record<string, Array<Record<string, string>>>,
): Record<string, unknown> {
  const allTags = getAllUniqueTags(templates)
  return buildReplacementsFromFormState(allTags, formData, tableData)
}
