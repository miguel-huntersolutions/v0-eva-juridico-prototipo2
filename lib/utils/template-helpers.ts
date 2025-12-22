/**
 * Helper functions for template processing
 */

/**
 * Extracts all tags/variables from text that match the pattern {{VARIABLE_NAME}}
 * @param text - The text content to search for tags
 * @returns Array of unique variable names found (without the {{}} brackets)
 */
export function extractTemplateTags(text: string): string[] {
  // Match pattern {{VARIABLE_NAME}} - case sensitive, allows underscores and alphanumeric
  const tagPattern = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g
  const matches = text.matchAll(tagPattern)
  const tags = new Set<string>()

  for (const match of matches) {
    if (match[1]) {
      tags.add(match[1])
    }
  }

  return Array.from(tags).sort()
}

/**
 * Extracts tags from a .docx file using mammoth
 * @param file - The File object to process
 * @returns Promise resolving to an array of unique variable names
 */
export async function extractTagsFromDocx(file: File): Promise<string[]> {
  try {
    // Dynamic import to avoid SSR issues
    const mammoth = await import("mammoth")
    
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    
    // Extract tags from the text content
    return extractTemplateTags(result.value)
  } catch (error) {
    console.error("Error extracting tags from .docx file:", error)
    throw new Error("No se pudo leer el archivo. Asegúrate de que sea un archivo .docx válido.")
  }
}

