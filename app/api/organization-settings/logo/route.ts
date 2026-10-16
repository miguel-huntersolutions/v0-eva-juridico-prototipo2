import { NextRequest, NextResponse } from "next/server"
import { ORGANIZATION_SELECT, authorizeOrganizationAdmin } from "@/lib/organization-settings"

const BUCKET = "entity-logos"
const MAX_SIZE = 2 * 1024 * 1024 // 2MB
// La extensión sale del tipo validado, nunca del nombre del archivo.
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

/**
 * POST /api/organization-settings/logo
 * FormData: file (png | jpeg | webp, máx. 2MB), organizationId
 * Sube el logo a `entity-logos/organizations/<id>/` y actualiza organizations.logo_url.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const organizationId = formData.get("organizationId")

    const auth = await authorizeOrganizationAdmin(typeof organizationId === "string" ? organizationId : null)
    if (!auth.ok) return auth.response

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    const ext = EXTENSIONS[file.type]
    if (!ext) {
      return NextResponse.json({ error: "Formato no permitido. Usa PNG, JPG o WEBP." }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El logo no puede superar 2MB." }, { status: 400 })
    }

    const filePath = `organizations/${organizationId}/logo-${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await auth.serviceClient.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType: file.type, upsert: false })
    if (uploadError) {
      console.error("[organization-settings/logo] upload error:", uploadError.message)
      return NextResponse.json({ error: "Failed to upload logo", message: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = auth.serviceClient.storage.from(BUCKET).getPublicUrl(filePath)

    const { data, error } = await auth.serviceClient
      .from("organizations")
      .update({ logo_url: urlData.publicUrl })
      .eq("id", organizationId as string)
      .select(ORGANIZATION_SELECT)
      .single()
    if (error) {
      return NextResponse.json({ error: "Failed to save logo", message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: urlData.publicUrl, organization: data })
  } catch (error) {
    console.error("[organization-settings/logo] error:", error)
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 })
  }
}
