/**
 * Eliminar un proceso y sus registros asociados.
 *
 * Se hace con service role (no con el cliente del browser) porque la política
 * RLS `processes_delete` solo permite admin/superadmin: para un member el
 * DELETE borraba 0 filas SIN error y la UI lo quitaba optimistamente — al
 * recargar, el proceso "eliminado" reaparecía.
 *
 * Aquí se valida la organización del caller y se verifica que el DELETE
 * realmente borre filas; si no, se devuelve un error visible.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ processId: string }> },
) {
  try {
    const { processId } = await params
    if (!processId) return NextResponse.json({ error: "processId is required" }, { status: 400 })

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

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Validar que el proceso pertenece a la organización del caller
    const { data: proc, error: procErr } = await service
      .from("processes")
      .select("id, code, entity:entities(organization_id)")
      .eq("id", processId)
      .single()
    if (procErr || !proc) return NextResponse.json({ error: "Process not found" }, { status: 404 })

    const orgId = (proc.entity as any)?.organization_id
    if (profile.role !== "superadmin" && profile.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 1. Documentos del proceso (registros en plataforma; los archivos en Drive
    //    no se eliminan — quedan en la carpeta de la entidad)
    const { error: docsErr } = await service
      .from("documents")
      .delete()
      .eq("process_id", processId)
    if (docsErr) {
      return NextResponse.json({ error: `No se pudieron eliminar los documentos: ${docsErr.message}` }, { status: 500 })
    }

    // 2. Campos guardados del formulario (tienen ON DELETE CASCADE si la tabla
    //    existe; esto es por si la migración 036 no se ha aplicado)
    try {
      await service.from("process_field_values").delete().eq("process_id", processId)
    } catch {
      // tabla inexistente: el CASCADE o su ausencia no bloquean el borrado
    }

    // 3. El proceso — con .select() para saber cuántas filas se borraron
    const { data: deleted, error: delErr } = await service
      .from("processes")
      .delete()
      .eq("id", processId)
      .select("id")

    if (delErr) {
      return NextResponse.json({ error: `No se pudo eliminar el proceso: ${delErr.message}` }, { status: 500 })
    }
    if (!deleted || deleted.length === 0) {
      return NextResponse.json(
        { error: "No se eliminó ningún registro. El proceso pudo haber sido eliminado antes." },
        { status: 409 },
      )
    }

    return NextResponse.json({ success: true, deletedProcessId: processId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
