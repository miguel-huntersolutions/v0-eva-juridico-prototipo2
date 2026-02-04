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
 * This preserves the original document formatting.
 * Documentos muy grandes: el proceso carga todo el .docx en memoria; la ruta de generación
 * usa maxDuration 120s, descarga con timeout 2 min y subida por stream si > 5 MB.
 *
 * @param fileBuffer - The .docx file buffer
 * @param replacements - Object mapping tag names to replacement values (tag names should NOT include {{}})
 * @param entityLogoUrl - Optional URL of the entity logo to include when {{LOGO_ENTIDAD}} is found
 * @returns Promise resolving to the modified file buffer
 */
export async function replaceTagsInDocx(
  fileBuffer: ArrayBuffer | Buffer,
  replacements: Record<string, string>,
  entityLogoUrl?: string | null,
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
    
    // If entity logo URL is provided, ALWAYS prepare image module and add to replacements
    // Even if tag not found in XML search, docxtemplater will process it if it exists in the document
    let imageModule: any = null
    if (entityLogoUrl) {
      try {
        console.log("[replaceTagsInDocx] Downloading logo from:", entityLogoUrl)
        // Download the logo image
        const logoResponse = await fetch(entityLogoUrl)
        if (logoResponse.ok) {
          const logoBuffer = Buffer.from(await logoResponse.arrayBuffer())
          console.log("[replaceTagsInDocx] Logo downloaded, size:", logoBuffer.length)
          
          // Get image extension
          const imageExtension = entityLogoUrl.split(".").pop()?.toLowerCase() || "png"
          
          // Initialize image module with proper configuration
          // According to docxtemplater-image-module-free docs:
          // - getImage(tagValue, tagName) receives the value from replacements and tag name
          // - Should return a Buffer, ArrayBuffer, or Promise that resolves to one
          // - getSize(img, tagValue, tagName) receives the image buffer and should return [width, height]
          imageModule = new ImageModule({
            centered: false,
            fileType: "docx",
            getImage: (tagValue: any, tagName: string) => {
              console.log("[replaceTagsInDocx] getImage called - tagName:", tagName, "tagValue type:", typeof tagValue, "isBuffer:", Buffer.isBuffer(tagValue))
              
              // If tagName is LOGO_ENTIDAD, return the logo buffer
              if (tagName === "LOGO_ENTIDAD") {
                console.log("[replaceTagsInDocx] Returning logo buffer for LOGO_ENTIDAD, size:", logoBuffer.length)
                return logoBuffer
              }
              
              // If tagValue is already a Buffer (we passed it directly), return it
              if (Buffer.isBuffer(tagValue)) {
                console.log("[replaceTagsInDocx] tagValue is a Buffer, returning it directly, size:", tagValue.length)
                return tagValue
              }
              
              // If tagValue is an object with _src property, return the buffer
              if (tagValue && typeof tagValue === "object" && tagValue._src && Buffer.isBuffer(tagValue._src)) {
                console.log("[replaceTagsInDocx] Returning buffer from object._src, size:", tagValue._src.length)
                return tagValue._src
              }
              
              console.log("[replaceTagsInDocx] Returning null for tagName:", tagName, "tagValue:", tagValue)
              return null
            },
            getSize: (img: Buffer, tagValue: any, tagName: string) => {
              console.log("[replaceTagsInDocx] getSize called - tagName:", tagName, "img size:", img?.length)
              // Return default dimensions (in pixels)
              // Width and height in pixels (Word uses EMU units internally)
              // Adjust these values as needed for your logo size
              if (tagValue && typeof tagValue === "object" && tagValue._width && tagValue._height) {
                return [tagValue._width, tagValue._height]
              }
              // Default size for logo
              return [200, 100] // [width, height] in pixels
            },
          })
          
          // Set the replacement value - can be anything, getImage will handle it based on tagName
          // We'll use a simple string marker so getImage can identify it by tagName
          finalReplacements.LOGO_ENTIDAD = "LOGO_ENTIDAD"
          console.log("[replaceTagsInDocx] LOGO_ENTIDAD set in replacements as marker string")
        } else {
          console.warn("[replaceTagsInDocx] Could not download entity logo, status:", logoResponse.status)
          // Still set it to empty string so the tag gets replaced
          finalReplacements.LOGO_ENTIDAD = ""
        }
      } catch (logoError) {
        console.warn("[replaceTagsInDocx] Error processing entity logo:", logoError)
        // Still set it to empty string so the tag gets replaced
        finalReplacements.LOGO_ENTIDAD = ""
      }
    } else if (hasLogoTag && !entityLogoUrl) {
      // If LOGO_ENTIDAD tag exists but no logo URL, replace with empty string
      console.warn("[replaceTagsInDocx] LOGO_ENTIDAD tag found but no logo URL provided")
      finalReplacements.LOGO_ENTIDAD = ""
    } else if (!hasLogoTag && !entityLogoUrl) {
      // Tag doesn't exist in document and no logo URL, no need to process
      console.log("[replaceTagsInDocx] LOGO_ENTIDAD tag not found in document and no logo URL")
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

