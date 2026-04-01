/**
 * Helper functions for template processing
 */

export const DYNAMIC_TABLE_PREFIX = "__TABLE__"

export interface DynamicTableTagDef {
  loopName: string
  fields: string[]
}

export function buildDynamicTableTagToken(loopName: string, fields: string[]): string {
  return `${DYNAMIC_TABLE_PREFIX}${loopName}__${fields.join(",")}`
}

export function parseDynamicTableTagToken(token: string): DynamicTableTagDef | null {
  if (!token.startsWith(DYNAMIC_TABLE_PREFIX)) return null
  const payload = token.slice(DYNAMIC_TABLE_PREFIX.length)
  const separatorIndex = payload.indexOf("__")
  if (separatorIndex <= 0) return null
  const loopName = payload.slice(0, separatorIndex).trim()
  const fieldsRaw = payload.slice(separatorIndex + 2).trim()
  if (!loopName || !fieldsRaw) return null
  const fields = fieldsRaw
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean)
  if (fields.length === 0) return null
  return { loopName, fields }
}

/**
 * Declarative table syntax:
 * {{TABLE:CLASIFICADORES@base:codigo:descripcion}}
 */
export function parseDeclarativeTableTag(tag: string): DynamicTableTagDef | null {
  const trimmed = tag.trim()
  // Legacy format:
  // TABLE:CLASIFICADORES@base:codigo:descripcion
  const mLegacy = trimmed.match(
    /^TABLE:([A-Za-z][A-Za-z0-9_]*@[A-Za-z][A-Za-z0-9_]*):([A-Za-z][A-Za-z0-9_]*(?::[A-Za-z][A-Za-z0-9_]*)*)$/
  )
  if (mLegacy) {
    const loopRaw = mLegacy[1].trim()
    const fields = mLegacy[2]
      .split(":")
      .map((f) => f.trim().toLowerCase())
      .filter(Boolean)
    const [family, variant = "base"] = loopRaw.split("@")
    if (!family || fields.length === 0) return null
    return { loopName: `${family}@${variant.toLowerCase()}`, fields }
  }

  // Robust format (recommended):
  // TABLE_CLASIFICADORES_BASE_CODIGO_DESCRIPCION
  if (trimmed.startsWith("TABLE_")) {
    const parts = trimmed.split("_").map((p) => p.trim()).filter(Boolean)
    // Expected: TABLE_<FAMILY>_<VARIANT>_<FIELD1>_<FIELD2>...
    if (parts.length >= 5 && parts[0] === "TABLE") {
      const family = parts[1]
      const variant = parts[2].toLowerCase()
      const fields = parts.slice(3).map((f) => f.toLowerCase())
      if (family && fields.length > 0) {
        return { loopName: `${family}@${variant}`, fields }
      }
    }
  }

  return null
}

function normalizeWordXmlForTagSearch(xml: string): string {
  // Join consecutive text runs so tags split by Word formatting can be detected.
  return xml
    .replace(/<\/w:t>\s*<\/w:r>\s*<w:r[^>]*>\s*<w:t[^>]*>/g, "")
    .replace(/<\/w:t>\s*<w:proofErr[^>]*\/>\s*<w:t[^>]*>/g, "")
}

function extractTextRunsFromWordXml(xml: string): string {
  const chunks: string[] = []
  const runPattern = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g
  for (const m of xml.matchAll(runPattern)) {
    if (typeof m[1] === "string") chunks.push(m[1])
  }
  return chunks.join("")
}

/**
 * Extracts all tags/variables from text that match the pattern {{VARIABLE_NAME}}
 * @param text - The text content to search for tags
 * @returns Array of unique variable names in order of first appearance in the document (no sorting)
 */
export function extractTemplateTags(text: string): string[] {
  const tags: string[] = []
  const seen = new Set<string>()

  // 1) Extract dynamic table blocks first: {{#NAME@variant}} ... {{/NAME@variant}}
  const loopPattern = /\{\{#([A-Za-z][A-Za-z0-9_]*@[A-Za-z][A-Za-z0-9_]*)\}\}([\s\S]*?)\{\{\/\1\}\}/g
  for (const match of text.matchAll(loopPattern)) {
    const loopName = (match[1] || "").trim()
    const blockBody = match[2] || ""
    if (!loopName) continue

    // Fields inside loop rows can be lower/upper/mixed: {{codigo}}, {{CODIGO}}, {{descripcion_2}}
    const fieldSet = new Set<string>()
    const fieldPattern = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g
    for (const fieldMatch of blockBody.matchAll(fieldPattern)) {
      const field = (fieldMatch[1] || "").trim()
      if (field) fieldSet.add(field)
    }

    if (fieldSet.size > 0) {
      const token = buildDynamicTableTagToken(loopName, Array.from(fieldSet))
      if (!seen.has(token)) {
        seen.add(token)
        tags.push(token)
      }
    }
  }

  // 2) Extract scalar tags: {{VARIABLE_NAME}}
  // Do not treat {{TABLE_...}} or {{TABLE:...}} as scalars — step 3 handles declarative tables.
  const scalarPattern = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g
  for (const match of text.matchAll(scalarPattern)) {
    const tag = match[1]
    if (!tag) continue
    if (parseDeclarativeTableTag(tag)) continue
    if (!seen.has(tag)) {
      seen.add(tag)
      tags.push(tag)
    }
  }

  // 3) Extract declarative table tags:
  // - {{TABLE:CLASIFICADORES@base:codigo:descripcion}}
  // - {{TABLE_CLASIFICADORES_BASE_CODIGO_DESCRIPCION}}
  const tableDeclPattern = /\{\{(TABLE:[^{}]+|TABLE_[A-Za-z0-9_]+)\}\}/g
  for (const match of text.matchAll(tableDeclPattern)) {
    const raw = (match[1] || "").trim()
    const parsed = parseDeclarativeTableTag(raw)
    if (!parsed) continue
    const token = buildDynamicTableTagToken(parsed.loopName, parsed.fields)
    if (!seen.has(token)) {
      seen.add(token)
      tags.push(token)
    }
  }

  return tags
}

/**
 * Extracts tags from a .docx file using mammoth
 * @param file - The File object to process
 * @returns Promise resolving to an array of unique variable names
 */
export async function extractTagsFromDocx(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const PizZip = (await import("pizzip")).default
    const zip = new PizZip(arrayBuffer)

    // Parse all Word XML parts (document, headers, footers, etc.) to preserve loops and TABLE tags.
    // Use both normalized raw XML and joined text runs to be robust against Word splitting tags.
    let xmlContent = ""
    let runTextContent = ""
    Object.keys(zip.files).forEach((fileName) => {
      if (fileName.startsWith("word/") && fileName.endsWith(".xml")) {
        const raw = zip.files[fileName]?.asText() || ""
        xmlContent += `\n${normalizeWordXmlForTagSearch(raw)}`
        runTextContent += `\n${extractTextRunsFromWordXml(raw)}`
      }
    })

    const merged = `${xmlContent}\n${runTextContent}`
    return extractTemplateTags(merged)
  } catch (error) {
    console.error("Error extracting tags from .docx file:", error)
    throw new Error("No se pudo leer el archivo. Asegúrate de que sea un archivo .docx válido.")
  }
}

