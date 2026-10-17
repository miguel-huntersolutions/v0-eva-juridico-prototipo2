import { parseDynamicTableTagToken, isImageTag } from "@/lib/utils/template-helpers"

const AUTO_SKIP_TAGS = new Set(["LOGO_ENTIDAD"])

/** Scalar tags eligible for smart fill (excludes tables, images, logo). */
export function getScalarTagsForSmartFill(allTags: string[]): string[] {
  return allTags.filter(
    (tag) => !parseDynamicTableTagToken(tag) && !isImageTag(tag) && !AUTO_SKIP_TAGS.has(tag),
  )
}

/** Build empty tableData structure from template tags. */
export function buildEmptyTableData(
  allTags: string[],
): Record<string, Array<Record<string, string>>> {
  const tableFamilyFields: Record<string, string[]> = {}
  allTags.forEach((tag) => {
    const tableDef = parseDynamicTableTagToken(tag)
    if (!tableDef) return
    const family = tableDef.loopName.split("@")[0] || tableDef.loopName
    if (!tableFamilyFields[family]) tableFamilyFields[family] = []
    tableDef.fields.forEach((field) => {
      if (!tableFamilyFields[family].includes(field)) tableFamilyFields[family].push(field)
    })
  })
  const tableData: Record<string, Array<Record<string, string>>> = {}
  Object.entries(tableFamilyFields).forEach(([family, fields]) => {
    tableData[family] = [Object.fromEntries(fields.map((f) => [f, ""]))] 
  })
  return tableData
}

/** Apply direct values from process selections and DB fields. */
export function applyDirectMappings(
  tags: string[],
  ctx: {
    entityName?: string
    secretaryName?: string
    processObject?: string
    processDescription?: string
  },
): Record<string, string> {
  const result: Record<string, string> = {}

  if (tags.includes("ENTIDAD") && ctx.entityName?.trim()) {
    result.ENTIDAD = ctx.entityName.trim()
  }
  if (tags.includes("SECRETARIA") && ctx.secretaryName?.trim()) {
    result.SECRETARIA = ctx.secretaryName.trim()
  }

  const objectTags = tags.filter((t) => /OBJETO/i.test(t) && !/DESCRIPCION/i.test(t))
  if (ctx.processObject?.trim()) {
    if (objectTags.includes("OBJETO")) result.OBJETO = ctx.processObject.trim()
    else if (objectTags.length === 1) result[objectTags[0]] = ctx.processObject.trim()
  }

  const descriptionTags = tags.filter((t) =>
    /DESCRIPCION|DETALLE|ALCANCE|ESPECIFIC/i.test(t),
  )
  if (ctx.processDescription?.trim()) {
    if (descriptionTags.includes("DESCRIPCION")) {
      result.DESCRIPCION = ctx.processDescription.trim()
    } else if (descriptionTags.length === 1) {
      result[descriptionTags[0]] = ctx.processDescription.trim()
    }
  }

  return result
}

export function mergeFormData(
  base: Record<string, string>,
  patch: Record<string, string>,
): Record<string, string> {
  const out = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    if (v != null && String(v).trim() !== "" && (!out[k] || out[k].trim() === "")) {
      out[k] = String(v).trim()
    }
  }
  return out
}

export function countFilled(tags: string[], formData: Record<string, string>): number {
  return tags.filter((t) => formData[t]?.trim()).length
}
