/**
 * RF-037 / B18 (CAP-02): adjuntos de proceso (PDF, imágenes, Word, Excel).
 * POST: sube un archivo a la carpeta del proceso en Drive y lo registra.
 * GET: lista los adjuntos de un proceso.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { getOrCreateProcessFolderPath } from "@/lib/google/drive"
import { getAuthenticatedOAuth2Client } from "@/lib/google/oauth"
import { google } from "googleapis"
import { Readable } from "stream"

export const maxDuration = 60

const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel",
]

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getProcessWithOrg(service: ReturnType<typeof getServiceClient>, processId: string) {
  const { data, error } = await service
    .from("processes")
    .select(`id, code, entity:entities(id, name, organization_id), secretary:secretaries(id, name)`)
    .eq("id", processId)
    .single()
  if (error || !data) return null
  return data
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    const processId = new URL(request.url).searchParams.get("processId")
    if (!processId) return NextResponse.json({ error: "processId is required" }, { status: 400 })

    const service = getServiceClient()
    const proc = await getProcessWithOrg(service, processId)
    if (!proc) return NextResponse.json({ error: "Process not found" }, { status: 404 })

    const orgId = (proc.entity as any)?.organization_id
    if ((profile.role === "admin" || profile.role === "member") && profile.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await service
      .from("process_attachments")
      .select("id, name, file_url, mime_type, file_size, uploaded_by, created_at")
      .eq("process_id", processId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ attachments: data || [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const processId = formData.get("processId") as string | null

    if (!file || !processId) {
      return NextResponse.json({ error: "file and processId are required" }, { status: 400 })
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${file.type}. Permitidos: PDF, imágenes, Word, Excel.` },
        { status: 400 },
      )
    }

    const service = getServiceClient()
    const proc = await getProcessWithOrg(service, processId)
    if (!proc) return NextResponse.json({ error: "Process not found" }, { status: 404 })

    const orgId = (proc.entity as any)?.organization_id
    if ((profile.role === "admin" || profile.role === "member") && profile.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Subir a Drive en la carpeta del proceso (Entidad/Secretaría/Proceso)
    const entityName = (proc.entity as any)?.name || "Entidad"
    const secretaryName = (proc.secretary as any)?.name || null
    const processCode = (proc as any).code || processId

    const { processFolderId } = await getOrCreateProcessFolderPath(
      user.id,
      { entityName, secretaryName, processCode },
      "session",
    )

    const auth = await getAuthenticatedOAuth2Client(user.id)
    const drive = google.drive({ version: "v3", auth })
    const buffer = Buffer.from(await file.arrayBuffer())
    const stream = Readable.from(buffer)

    const driveId = process.env.GOOGLE_DRIVE_ID
    const createOptions: any = {
      requestBody: { name: file.name, parents: [processFolderId] },
      media: { mimeType: file.type, body: stream },
      fields: "id, name, webViewLink",
    }
    if (driveId) {
      createOptions.supportsAllDrives = true
      ;(createOptions.requestBody as any).driveId = driveId
    }

    const driveRes = await drive.files.create(createOptions)
    const driveFileId = driveRes.data.id
    if (!driveFileId) throw new Error("No file ID returned from Drive")

    if (!driveId) {
      await drive.permissions.create({
        fileId: driveFileId,
        requestBody: { role: "reader", type: "anyone" },
      })
    }

    const fileUrl = driveRes.data.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`

    // Registrar en DB (no silencioso: si falla, se reporta)
    const { data: attachment, error: insertError } = await service
      .from("process_attachments")
      .insert({
        process_id: processId,
        name: file.name,
        file_url: fileUrl,
        drive_file_id: driveFileId,
        mime_type: file.type,
        file_size: buffer.length,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        {
          error: "El archivo se subió a Drive pero no se pudo registrar en la plataforma.",
          fileUrl,
          message: insertError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, attachment })
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to upload attachment", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
