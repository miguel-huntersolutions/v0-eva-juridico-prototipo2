/**
 * CAP-10 (RF-033): validación de variables de una plantilla maestra al cargarla.
 *
 * POST { fileUrl } → descarga el DOCX de Drive con la cuenta del usuario,
 * extrae el texto de cuerpo + encabezados + pies (word/*.xml) y:
 *  - detecta TODAS las variables {{...}}, incluidas las de minúsculas (CA-033.1)
 *  - RECHAZA la carga si hay una variable sin cerrar, indicando cuál y el
 *    fragmento donde aparece (CA-033.2; en DOCX no hay páginas fijas, se
 *    reporta el contexto del texto)
 *  - lista cuáles variables ya existen en otras plantillas de la organización
 *    (se tratarán como el mismo dato, CAP-03 — CA-033.3)
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import PizZip from "pizzip"
import { downloadFileFromDrive } from "@/lib/google/drive"

export const maxDuration = 60

/** Extrae el fileId de una URL de Drive o del formato "fileId:xxx|..." */
function extractFileId(fileUrl: string): string | null {
  if (fileUrl.startsWith("fileId:")) {
    return fileUrl.match(/fileId:([^|]+)/)?.[1] ?? null
  }
  const m =
    fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    fileUrl.match(/^([a-zA-Z0-9_-]{20,})$/)
  return m?.[1] ?? null
}

/** Texto visible de un XML de Word: contenido de los <w:t> */
function xmlToText(xml: string): string {
  const parts: string[] = []
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  while ((match = re.exec(xml)) !== null) parts.push(match[1])
  return parts.join("")
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 })
    // La carga de plantillas es del superadmin (y admin de la firma)
    if (profile.role !== "superadmin" && profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const fileUrl = typeof body?.fileUrl === "string" ? body.fileUrl.trim() : ""
    if (!fileUrl) return NextResponse.json({ error: "fileUrl es obligatorio" }, { status: 400 })

    const fileId = extractFileId(fileUrl)
    if (!fileId) {
      return NextResponse.json(
        { error: "No se pudo obtener el ID del archivo. Usa la URL de Google Drive del documento." },
        { status: 400 },
      )
    }

    // Descargar el DOCX con la cuenta del usuario que carga
    let buffer: Buffer
    try {
      buffer = await downloadFileFromDrive(user.id, fileId)
    } catch (err) {
      return NextResponse.json(
        {
          error: `No se pudo leer el documento de Drive: ${err instanceof Error ? err.message : "error"}. Verifica que la cuenta conectada tenga acceso.`,
        },
        { status: 400 },
      )
    }

    // Abrir el DOCX y leer cuerpo + encabezados + pies (CA-033.1)
    let zip: PizZip
    try {
      zip = new PizZip(buffer)
    } catch {
      return NextResponse.json(
        { error: "El archivo no es un documento Word (.docx) válido. Exporta la plantilla como .docx." },
        { status: 400 },
      )
    }

    const xmlFiles = Object.keys(zip.files).filter((name) =>
      /^word\/(document|header\d*|footer\d*)\.xml$/.test(name),
    )
    let fullText = ""
    for (const name of xmlFiles) {
      const xml = zip.file(name)?.asText()
      if (xml) fullText += "\n" + xmlToText(xml)
    }

    if (!fullText.trim()) {
      return NextResponse.json(
        { error: "No se encontró texto en el documento. ¿Está vacío o es un escaneado?" },
        { status: 400 },
      )
    }

    // Variables bien formadas: {{LOQUESEA}} (cualquier caso, espacios internos ok)
    const variableSet = new Set<string>()
    const varRe = /\{\{\s*([A-Za-zÁÉÍÓÚÜÑ0-9_]+)\s*\}\}/g
    let vm
    while ((vm = varRe.exec(fullText)) !== null) {
      variableSet.add(vm[1].toUpperCase())
    }
    const variables = [...variableSet].sort()

    // Variables SIN CERRAR (CA-033.2): "{{" que no cierra con "}}" antes del
    // siguiente "{{" o del fin. Se reporta cuál y el fragmento de contexto.
    const unclosed: Array<{ fragment: string; context: string }> = []
    let searchFrom = 0
    while (true) {
      const open = fullText.indexOf("{{", searchFrom)
      if (open === -1) break
      const close = fullText.indexOf("}}", open + 2)
      const nextOpen = fullText.indexOf("{{", open + 2)
      if (close === -1 || (nextOpen !== -1 && nextOpen < close)) {
        const context = fullText.slice(Math.max(0, open - 40), open + 60).replace(/\s+/g, " ").trim()
        const fragment = fullText.slice(open, Math.min(open + 40, nextOpen === -1 ? open + 40 : nextOpen)).trim()
        unclosed.push({ fragment, context })
        searchFrom = open + 2
      } else {
        searchFrom = close + 2
      }
    }

    if (unclosed.length > 0) {
      return NextResponse.json(
        {
          valid: false,
          error: `La plantilla tiene ${unclosed.length} variable(s) sin cerrar. Corrige el documento y vuelve a cargarlo.`,
          unclosed,
        },
        { status: 400 },
      )
    }

    // Variables ya conocidas en la organización (CA-033.3)
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const service = key
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null

    let knownVariables: string[] = []
    if (service && profile.organization_id) {
      const { data: templates } = await service
        .from("templates")
        .select("detected_variables, entity:entities!inner(organization_id)")
        .eq("entity.organization_id", profile.organization_id)
      const known = new Set<string>()
      for (const t of templates || []) {
        for (const v of (t.detected_variables as string[] | null) ?? []) known.add(v)
      }
      knownVariables = variables.filter((v) => known.has(v))
    }

    return NextResponse.json({
      valid: true,
      variables,
      knownVariables,
      newVariables: variables.filter((v) => !knownVariables.includes(v)),
      sectionsScanned: xmlFiles.length,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
