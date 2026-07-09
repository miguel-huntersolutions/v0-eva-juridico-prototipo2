import { parseDynamicTableTagToken, isImageTag } from "@/lib/utils/template-helpers"
import { getScalarTagsForSmartFill } from "@/lib/smart-fill/tag-utils"

export type GenerationGap = {
  type: "scalar" | "table" | "image"
  tag?: string
  family?: string
  field?: string
  reason: string
}

export function buildGenerationGaps(
  allTags: string[],
  formData: Record<string, string>,
): GenerationGap[] {
  const gaps: GenerationGap[] = []
  const scalarTags = getScalarTagsForSmartFill(allTags)

  for (const tag of scalarTags) {
    if (!formData[tag]?.trim()) {
      gaps.push({ type: "scalar", tag, reason: "empty_after_smart_fill" })
    }
  }

  const tableFamilies = new Set<string>()
  for (const tag of allTags) {
    const def = parseDynamicTableTagToken(tag)
    if (def) {
      const family = def.loopName.split("@")[0] || def.loopName
      tableFamilies.add(family)
    }
    if (isImageTag(tag)) {
      gaps.push({ type: "image", tag, reason: "requires_binary_upload" })
    }
  }

  for (const family of tableFamilies) {
    gaps.push({
      type: "table",
      family,
      reason: "mcp_tables_not_supported",
    })
  }

  return gaps
}
