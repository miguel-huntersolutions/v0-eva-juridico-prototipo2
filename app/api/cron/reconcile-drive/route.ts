/**
 * RF-011 (CAP-02): conciliación Drive ↔ DB.
 * Detecta archivos en las carpetas de proceso de Drive que no están registrados
 * en `documents` ni en `process_attachments` (huérfanos por fallo de registro).
 *
 * Pensado para Vercel Cron (diario). Protegido con CRON_SECRET.
 * También puede invocarse manualmente por un superadmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { google } from "googleapis"
import { getAuthenticatedOAuth2ClientForServer } from "@/lib/google/oauth"

export const maxDuration = 300

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function isAuthorized(request: NextRequest): Promise<boolean> {
  // Vercel Cron envía Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true

  // Manual: superadmin autenticado
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  return profile?.role === "superadmin"
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const service = getServiceClient()

    // Procesos con carpeta de Drive registrada
    const { data: processes, error } = await service
      .from("processes")
      .select("id, code, drive_folder_id, created_by")
      .not("drive_folder_id", "is", null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const orphans: Array<{
      processId: string
      processCode: string
      fileId: string
      fileName: string
      webViewLink: string
    }> = []

    let checked = 0
    let skipped = 0

    for (const proc of processes || []) {
      const ownerId = (proc as any).created_by
      if (!ownerId || !(proc as any).drive_folder_id) {
        skipped++
        continue
      }

      try {
        const auth = await getAuthenticatedOAuth2ClientForServer(ownerId)
        const drive = google.drive({ version: "v3", auth })

        const folderId = (proc as any).drive_folder_id as string
        const res = await drive.files.list({
          q: `'${folderId}' in parents and trashed=false`,
          fields: "files(id, name, webViewLink)",
          spaces: "drive",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        })

        const files = res.data.files || []

        // URLs ya registradas para este proceso
        const [{ data: docs }, { data: atts }] = await Promise.all([
          service.from("documents").select("file_url").eq("process_id", proc.id),
          service.from("process_attachments").select("file_url, drive_file_id").eq("process_id", proc.id),
        ])

        const knownUrls = new Set(
          [...(docs || []).map((d: any) => d.file_url), ...(atts || []).map((a: any) => a.file_url)].filter(Boolean),
        )
        const knownDriveIds = new Set((atts || []).map((a: any) => a.drive_file_id).filter(Boolean))

        for (const f of files) {
          const url = f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`
          const isKnown = knownUrls.has(url) || (f.id && knownDriveIds.has(f.id))
          if (!isKnown) {
            orphans.push({
              processId: proc.id,
              processCode: (proc as any).code || proc.id,
              fileId: f.id!,
              fileName: f.name || "sin nombre",
              webViewLink: url,
            })
          }
        }
        checked++
      } catch {
        // Si no se puede leer la carpeta de un proceso (tokens, permisos), se omite.
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      processesChecked: checked,
      processesSkipped: skipped,
      orphansFound: orphans.length,
      orphans,
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Reconciliation failed", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
