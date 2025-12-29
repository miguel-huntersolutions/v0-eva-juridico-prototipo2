/**
 * Document generation utilities
 * Functions to replace tags in documents and generate final files
 */

import { extractTemplateTags } from "./template-helpers"

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
  
  return Array.from(allTags).sort()
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
 * This preserves the original document formatting
 * @param fileBuffer - The .docx file buffer
 * @param replacements - Object mapping tag names to replacement values (tag names should NOT include {{}})
 * @returns Promise resolving to the modified file buffer
 */
export async function replaceTagsInDocx(
  fileBuffer: ArrayBuffer | Buffer,
  replacements: Record<string, string>,
): Promise<Buffer> {
  try {
    // Dynamic import to avoid SSR issues
    const Docxtemplater = (await import("docxtemplater")).default
    const PizZip = (await import("pizzip")).default
    
    // Convert ArrayBuffer to Buffer if needed
    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
    
    // Load the docx file as a zip
    const zip = new PizZip(buffer)
    
    // Create and render the document
    // Configure to use {{}} delimiters to match our template format
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: "{{",
        end: "}}",
      },
    })
    
    // Render the document with replacements (new API - pass data directly to render)
    // The keys should match the tag names without {{}}
    doc.render(replacements)
    
    // Get the document as a buffer
    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    })
    
    return Buffer.from(buf)
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

