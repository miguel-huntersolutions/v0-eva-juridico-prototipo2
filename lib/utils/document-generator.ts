/**
 * Document generation utilities
 * Functions to replace tags in documents and generate final files
 */

import { extractTemplateTags } from "./template-helpers"
import { parseDeclarativeTableTag } from "./template-helpers"

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function buildWordCell(text: string): string {
  return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`
}

function buildWordTableXml(fields: string[], rows: Array<Record<string, string>>): string {
  const headerRow = `<w:tr>${fields.map((f) => buildWordCell(f.toUpperCase())).join("")}</w:tr>`
  const bodyRows = rows
    .map((row) => `<w:tr>${fields.map((f) => buildWordCell(row?.[f] ?? "")).join("")}</w:tr>`)
    .join("")
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="8" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="8" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="8" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="8" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr><w:tblGrid>${fields.map(() => `<w:gridCol w:w="2400"/>`).join("")}</w:tblGrid>${headerRow}${bodyRows}</w:tbl>`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildRowsForDeclarativeTable(
  parsed: { loopName: string; fields: string[] },
  replacements: Record<string, any>,
): Array<Record<string, string>> {
  const rowsRaw = replacements[parsed.loopName]
  if (!Array.isArray(rowsRaw)) return []
  return rowsRaw.map((r: any) => {
    const out: Record<string, string> = {}
    parsed.fields.forEach((f) => {
      out[f] = r?.[f] != null ? String(r[f]) : ""
    })
    return out
  })
}

/** Join all w:t in a paragraph (Word often splits placeholders across runs / hyperlinks). */
function stitchParagraphWText(paraXml: string): string {
  const chunks: string[] = []
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g
  for (const m of paraXml.matchAll(re)) {
    chunks.push(m[1] ?? "")
  }
  return chunks.join("")
}

/**
 * If stitched text contains {{TABLE...}} but XML is not contiguous, replace whole <w:p> with <w:tbl>.
 * Assumes the placeholder is on its own paragraph (usual for generated tables).
 */
function injectTableInParagraphUsingStitchedText(paraXml: string, replacements: Record<string, any>): string {
  const stitched = stitchParagraphWText(paraXml)
  const tagRe = /\{\{(TABLE:[^{}]+|TABLE_[A-Za-z0-9_]+)\}\}/
  const tm = tagRe.exec(stitched)
  if (!tm) return paraXml
  const rawTag = tm[1]
  const parsed = parseDeclarativeTableTag(rawTag)
  if (!parsed) return paraXml
  const rows = buildRowsForDeclarativeTable(parsed, replacements)
  return buildWordTableXml(parsed.fields, rows)
}

function injectDeclarativeTablesIntoXml(xml: string, replacements: Record<string, any>): string {
  // Collapse runs inside each paragraph first (long TABLE_ tags are often split many times).
  let output = xml.replace(/<w:p(\s[^>]*)?>[\s\S]*?<\/w:p>/gi, (para) => collapseWordRunsForTableTags(para))

  const applyOneTableFromContiguousTag = (src: string): { next: string; changed: boolean } => {
    const re = /\{\{(TABLE:[^{}]+|TABLE_[A-Za-z0-9_]+)\}\}/
    const m = re.exec(src)
    if (!m) return { next: src, changed: false }
    const rawTag = m[1]
    const parsed = parseDeclarativeTableTag(rawTag)
    if (!parsed) return { next: src.replace(re, ""), changed: true }
    const rows = buildRowsForDeclarativeTable(parsed, replacements)
    const tableXml = buildWordTableXml(parsed.fields, rows)
    const fullTag = `{{${rawTag}}}`
    const paragraphPattern = new RegExp(
      `<w:p[^>]*>(?:(?!<\\/w:p>)[\\s\\S])*?${escapeRegExp(fullTag)}(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>`
    )
    if (paragraphPattern.test(src)) {
      return { next: src.replace(paragraphPattern, tableXml), changed: true }
    }
    return { next: src, changed: false }
  }

  for (let i = 0; i < 40; i++) {
    const { next, changed } = applyOneTableFromContiguousTag(output)
    output = next
    if (!changed) break
  }

  // Word may keep {{TABLE...}} split across runs/hyperlinks so the tag is not a contiguous substring.
  output = output.replace(/<w:p(\s[^>]*)?>[\s\S]*?<\/w:p>/gi, (para) =>
    injectTableInParagraphUsingStitchedText(para, replacements),
  )

  // Fallback for truncated markers that Word can leave as plain text (without {{...}}),
  // e.g. "TABLE:CLASIFICADORES". We infer the best available variant from replacements.
  const looseFamilyRegex = /TABLE(?::|_)([A-Za-z][A-Za-z0-9_]*)/g
  const processedFamilies = new Set<string>()
  for (const match of output.matchAll(looseFamilyRegex)) {
    const family = (match[1] || "").trim()
    if (!family || processedFamilies.has(family)) continue
    processedFamilies.add(family)

    const availableLoopNames = Object.keys(replacements).filter(
      (k) => k.startsWith(`${family}@`) && Array.isArray(replacements[k])
    )
    if (availableLoopNames.length === 0) continue

    const preferredLoopName =
      availableLoopNames.find((k) => k.endsWith("@base")) || availableLoopNames[0]
    const rowsRaw = replacements[preferredLoopName]
    if (!Array.isArray(rowsRaw) || rowsRaw.length === 0) continue

    const fields = Object.keys(rowsRaw[0] || {})
    if (fields.length === 0) continue

    const rows: Array<Record<string, string>> = rowsRaw.map((r: any) => {
      const out: Record<string, string> = {}
      fields.forEach((f) => {
        out[f] = r?.[f] != null ? String(r[f]) : ""
      })
      return out
    })

    const tableXml = buildWordTableXml(fields, rows)
    const paragraphPattern = new RegExp(
      `<w:p[^>]*>(?:(?!<\\/w:p>)[\\s\\S])*?TABLE:${escapeRegExp(family)}(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>`
    )
    if (paragraphPattern.test(output)) {
      output = output.replace(paragraphPattern, tableXml)
    }
  }

  // Safety net: strip remaining braced TABLE markers (avoid broken placeholders in output).
  // Do not use a broad TABLE_* text strip — it mangles partial tags and leaves empty cells.
  output = output
    .replace(/\{\{\s*(?:TABLE:[^{}]+|TABLE_[A-Za-z0-9_]+)\}\}/g, "")
    .replace(/TABLE:[A-Za-z][A-Za-z0-9_]*/g, "")

  return output
}

function normalizeWordXmlForTableReplacement(xml: string): string {
  // Word can split placeholders across runs, line breaks, hyperlinks, and proofing markers.
  return xml
    .replace(/<w:proofErr[^>]*\/>/g, "")
    .replace(/<\/w:t>\s*<\/w:r>\s*<w:r[^>]*>\s*<w:t[^>]*>/g, "")
    .replace(/<\/w:t>\s*<w:proofErr[^>]*\/>\s*<w:t[^>]*>/g, "")
    // Line-break run between text runs (same paragraph)
    .replace(
      /<\/w:t>\s*<\/w:r>\s*<w:r[^>]*>(?:\s*<w:rPr>[\s\S]*?<\/w:rPr>)?\s*<w:br\b[^>]*\/>\s*<\/w:r>\s*<w:r[^>]*>\s*<w:t(?:\s[^>]*)?>/g,
      "",
    )
    // Placeholder split across hyperlinks
    .replace(
      /<\/w:t>\s*<\/w:r>\s*<\/w:hyperlink>\s*<w:hyperlink(?:\s[^>]*)?>\s*<w:r[^>]*>\s*<w:t(?:\s[^>]*)?>/g,
      "",
    )
}

/** Long tags like {{TABLE_...}} are often split across many runs; repeat until stable. */
function collapseWordRunsForTableTags(xml: string): string {
  let prev: string | null = null
  let out = xml
  for (let i = 0; i < 80 && out !== prev; i++) {
    prev = out
    out = normalizeWordXmlForTableReplacement(out)
  }
  return out
}

/**
 * Get all unique tags from multiple templates
 * @param templates - Array of templates with their variables
 * @returns Array of unique tag names
 */
export function getAllUniqueTags(templates: Array<{ variables?: string[] | null }>): string[] {
  const allTags = new Set<string>()

  templates.forEach((template) => {
    if (template.variables && Array.isArray(template.variables)) {
      template.variables.forEach((tag) => allTags.add(tag))
    }
  })

  // Drop raw {{TABLE_...}} strings wrongly stored as scalar vars (same as extractTemplateTags fix).
  return Array.from(allTags)
    .filter((tag) => !parseDeclarativeTableTag(tag))
    .sort()
}

/**
 * Replace tags in text content
 * @param text - The text content with tags
 * @param replacements - Object mapping tag names to replacement values
 * @returns Text with tags replaced
 */
export function replaceTagsInText(text: string, replacements: Record<string, string>): string {
  let result = text
  
  // Replace each tag in the format {{TAG_NAME}}
  Object.entries(replacements).forEach(([tag, value]) => {
    const regex = new RegExp(`\\{\\{${tag}\\}\\}`, "g")
    result = result.replace(regex, value)
  })
  
  return result
}

/**
 * Replace tags in a .docx file buffer using docxtemplater
 * This preserves the original document formatting.
 * Documentos muy grandes: el proceso carga todo el .docx en memoria; la ruta de generación
 * usa maxDuration 120s, descarga con timeout 2 min y subida por stream si > 5 MB.
 *
 * @param fileBuffer - The .docx file buffer
 * @param replacements - Object mapping tag names to replacement values (tag names should NOT include {{}})
 * @param entityLogoUrl - Optional URL of the entity logo to include when {{LOGO_ENTIDAD}} is found
 * @returns Promise resolving to the modified file buffer
 */
/**
 * Imagen genérica para los tags {{IMAGE}} / {{IMAGE_*}}.
 * `buffer` es el contenido binario del archivo subido por el usuario.
 */
export interface TemplateImageInput {
  buffer: Buffer
  /** Ancho en píxeles. Default: 400. */
  width?: number
  /** Alto en píxeles. Default: 300. */
  height?: number
}

export async function replaceTagsInDocx(
  fileBuffer: ArrayBuffer | Buffer,
  replacements: Record<string, any>,
  entityLogoUrl?: string | null,
  /** Mapa por tag (sin {{}}) -> imagen subida por el usuario. */
  images?: Record<string, TemplateImageInput> | null,
): Promise<Buffer> {
  try {
    // Dynamic import to avoid SSR issues
    const Docxtemplater = (await import("docxtemplater")).default
    const PizZip = (await import("pizzip")).default
    // @ts-ignore - docxtemplater-image-module-free doesn't have types
    const ImageModule = (await import("docxtemplater-image-module-free")).default
    
    // Convert ArrayBuffer to Buffer if needed
    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
    
    // Load the docx file as a zip
    const zip = new PizZip(buffer)

    // Expand declarative TABLE tags into real Word table XML before docxtemplater render.
    Object.keys(zip.files).forEach((fileName) => {
      if (!fileName.startsWith("word/") || !fileName.endsWith(".xml")) return
      const raw = zip.files[fileName]?.asText?.()
      if (!raw || (!raw.includes("TABLE:") && !raw.includes("TABLE_"))) return
      // Do not require "{{TABLE_" as one contiguous string — Word splits long tags across runs.
      const collapsed = collapseWordRunsForTableTags(raw)
      const injected = injectDeclarativeTablesIntoXml(collapsed, replacements)
      if (injected !== raw) {
        zip.file(fileName, injected)
      }
    })

    // (La inyección del prefijo `%` para tags de imagen se hace más abajo,
    // una vez construido el mapa imageBufferMap, para inyectar solo donde haya datos.)
    
    // Prepare replacements
    const finalReplacements: Record<string, any> = { ...replacements }
    
    // Check if LOGO_ENTIDAD tag exists in the document by searching in all XML files
    // We need to check the document content, not just replacements
    // Search in multiple XML files as the tag might be in different locations
    let hasLogoTag = false
    let docxContent = ""
    
    // Check main document XML
    const mainDoc = zip.files["word/document.xml"]
    if (mainDoc) {
      docxContent = mainDoc.asText() || ""
      hasLogoTag = docxContent.includes("LOGO_ENTIDAD")
    }
    
    // Also check header and footer files if main document doesn't have it
    if (!hasLogoTag) {
      // Check headers
      for (const fileName in zip.files) {
        if (fileName.startsWith("word/header") && fileName.endsWith(".xml")) {
          const headerContent = zip.files[fileName]?.asText() || ""
          if (headerContent.includes("LOGO_ENTIDAD")) {
            hasLogoTag = true
            docxContent = headerContent
            break
          }
        }
      }
    }
    
    // Check footers
    if (!hasLogoTag) {
      for (const fileName in zip.files) {
        if (fileName.startsWith("word/footer") && fileName.endsWith(".xml")) {
          const footerContent = zip.files[fileName]?.asText() || ""
          if (footerContent.includes("LOGO_ENTIDAD")) {
            hasLogoTag = true
            docxContent = footerContent
            break
          }
        }
      }
    }
    
    // Also check if tag is in replacements (user might have filled it in the form)
    if (!hasLogoTag && "LOGO_ENTIDAD" in replacements) {
      hasLogoTag = true
    }
    
    console.log("[replaceTagsInDocx] Checking for LOGO_ENTIDAD tag:", {
      hasLogoTag,
      entityLogoUrl,
      tagInMainDoc: mainDoc?.asText()?.includes("LOGO_ENTIDAD") || false,
      tagInReplacements: "LOGO_ENTIDAD" in replacements,
      sampleContent: docxContent.substring(0, 200), // First 200 chars for debugging
    })
    
    // Construye el mapa de buffers por tag (LOGO_ENTIDAD + IMAGE/IMAGE_* genéricos).
    // El ImageModule busca aquí el binario y el tamaño por tagName.
    const imageBufferMap: Record<string, { buffer: Buffer; width: number; height: number }> = {}
    const DEFAULT_IMAGE_WIDTH = 400 // px (tamaño "mediano" en el doc; ajustable en Word)
    const DEFAULT_IMAGE_HEIGHT = 300

    if (entityLogoUrl) {
      try {
        console.log("[replaceTagsInDocx] Downloading logo from:", entityLogoUrl)
        const logoResponse = await fetch(entityLogoUrl)
        if (logoResponse.ok) {
          const logoBuffer = Buffer.from(await logoResponse.arrayBuffer())
          console.log("[replaceTagsInDocx] Logo downloaded, size:", logoBuffer.length)
          imageBufferMap.LOGO_ENTIDAD = { buffer: logoBuffer, width: 200, height: 100 }
          finalReplacements.LOGO_ENTIDAD = "LOGO_ENTIDAD"
        } else {
          console.warn("[replaceTagsInDocx] Could not download entity logo, status:", logoResponse.status)
          finalReplacements.LOGO_ENTIDAD = ""
        }
      } catch (logoError) {
        console.warn("[replaceTagsInDocx] Error processing entity logo:", logoError)
        finalReplacements.LOGO_ENTIDAD = ""
      }
    } else if (hasLogoTag && !entityLogoUrl) {
      console.warn("[replaceTagsInDocx] LOGO_ENTIDAD tag found but no logo URL provided")
      finalReplacements.LOGO_ENTIDAD = ""
    }

    // Imágenes genéricas {{IMAGE}} / {{IMAGE_*}} subidas por el usuario en el formulario.
    if (images) {
      for (const [tagName, img] of Object.entries(images)) {
        if (!img || !Buffer.isBuffer(img.buffer) || img.buffer.length === 0) continue
        imageBufferMap[tagName] = {
          buffer: img.buffer,
          width: typeof img.width === "number" && img.width > 0 ? img.width : DEFAULT_IMAGE_WIDTH,
          height: typeof img.height === "number" && img.height > 0 ? img.height : DEFAULT_IMAGE_HEIGHT,
        }
        // Marcador: getImage usa el tagName para localizar el buffer en el mapa.
        finalReplacements[tagName] = tagName
      }
    }

    // docxtemplater-image-module-free reconoce las etiquetas de imagen por el prefijo `%`
    // ({{%TAG}}). Reescribimos `{{TAG}}` -> `{{%TAG}}` SOLO para los tags que tienen
    // imagen disponible en imageBufferMap (LOGO_ENTIDAD + IMAGE/IMAGE_*), para no romper
    // la plantilla cuando un tag IMAGE aparece sin imagen subida.
    const imageTagNames = Object.keys(imageBufferMap)
    if (imageTagNames.length > 0) {
      const escapedTags = imageTagNames.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
      const prefixPattern = new RegExp(`\\{\\{(?!%)(${escapedTags})\\}\\}`, "g")
      Object.keys(zip.files).forEach((fileName) => {
        if (!fileName.startsWith("word/") || !fileName.endsWith(".xml")) return
        const raw = zip.files[fileName]?.asText?.()
        if (!raw) return
        // Si ninguno de los nombres está siquiera presente como substring, saltamos.
        if (!imageTagNames.some((t) => raw.includes(t))) return
        // Word puede partir el tag entre varios runs; colapsamos antes de buscar.
        const collapsed = collapseWordRunsForTableTags(raw)
        const withPrefix = collapsed.replace(prefixPattern, "{{%$1}}")
        if (withPrefix !== raw) {
          zip.file(fileName, withPrefix)
        }
      })
    }

    let imageModule: any = null
    if (imageTagNames.length > 0) {
      imageModule = new ImageModule({
        centered: false,
        fileType: "docx",
        getImage: (_tagValue: any, tagName: string) => {
          const entry = imageBufferMap[tagName]
          if (entry) return entry.buffer
          if (Buffer.isBuffer(_tagValue)) return _tagValue
          return null
        },
        getSize: (_img: Buffer, _tagValue: any, tagName: string) => {
          const entry = imageBufferMap[tagName]
          if (entry) return [entry.width, entry.height]
          return [DEFAULT_IMAGE_WIDTH, DEFAULT_IMAGE_HEIGHT]
        },
      })
    }
    
    // Create and render the document
    // Configure to use {{}} delimiters to match our template format
    const docOptions: any = {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: "{{",
        end: "}}",
      },
      // Avoid literal "undefined" when a tag remains in the doc without a data key
      nullGetter: () => "",
    }
    
    // Add image module if logo is being inserted
    if (imageModule) {
      docOptions.modules = [imageModule]
      console.log("[replaceTagsInDocx] Image module added to docxtemplater")
    }
    
    const doc = new Docxtemplater(zip, docOptions)
    
    // Log what we're about to render
    console.log("[replaceTagsInDocx] About to render with replacements:", {
      hasLogoInReplacements: "LOGO_ENTIDAD" in finalReplacements,
      logoValue: finalReplacements.LOGO_ENTIDAD,
      allKeys: Object.keys(finalReplacements),
      hasImageModule: !!imageModule,
    })
    
    // Render the document with replacements (new API - pass data directly to render)
    // The keys should match the tag names without {{}}
    try {
      doc.render(finalReplacements)
      console.log("[replaceTagsInDocx] Document rendered successfully")
    } catch (renderError) {
      console.error("[replaceTagsInDocx] Error during render:", renderError)
      throw renderError
    }
    
    // Get the document as a buffer
    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    })
    
    // generate() already returns a Buffer when type is "nodebuffer"
    return buf as Buffer
  } catch (error) {
    console.error("Error replacing tags in .docx:", error)
    if (error instanceof Error && error.message.includes("Unclosed")) {
      throw new Error("Error en el formato del documento. Verifica que los tags estén correctamente cerrados.")
    }
    throw new Error(`No se pudo procesar el documento: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Download a template file from Google Drive
 * @param fileUrl - The file URL or path in Google Drive
 * @returns Promise resolving to the file buffer
 */
export async function downloadTemplateFromDrive(fileUrl: string): Promise<ArrayBuffer> {
  try {
    // If it's a Drive path (plantillas/...), we need to get the actual file
    // For now, we'll assume it's a direct download URL
    // In production, you'd need to resolve the path to a file ID first
    
    // If it's already a direct link, use it
    if (fileUrl.startsWith("http")) {
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
      }
      return await response.arrayBuffer()
    }
    
    // If it's a path, we need to resolve it to a file ID
    // This would require calling the Google Drive API
    throw new Error("File path resolution not yet implemented")
  } catch (error) {
    console.error("Error downloading template from Drive:", error)
    throw new Error(`No se pudo descargar la plantilla: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

