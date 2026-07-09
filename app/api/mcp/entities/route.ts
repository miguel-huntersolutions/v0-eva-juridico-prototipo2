import { NextRequest, NextResponse } from "next/server"
import { assertMcpApiKey } from "@/lib/mcp/auth"
import { McpEntitiesQuerySchema } from "@/lib/mcp/types"
import { getEntitiesForMcpUser } from "@/lib/mcp/entity-access"
import { resolveChannelUser } from "@/lib/mcp/resolve-user"
import { getMcpServiceClient } from "@/lib/mcp/service-client"
import { getTemplatesForMcpEntity } from "@/lib/mcp/templates"

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = assertMcpApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = McpEntitiesQuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 })
    }

    const { channel, externalUserId, phone } = parsed.data
    const resolved = await resolveChannelUser({
      channel,
      externalId: externalUserId,
      phone,
    })

    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error, linked: false }, { status: 403 })
    }

    const entities = await getEntitiesForMcpUser(resolved.user)
    const supabase = getMcpServiceClient()

    const enriched = await Promise.all(
      entities.map(async (e) => {
        const { data: secretaries } = await supabase
          .from("secretaries")
          .select("id, name")
          .eq("entity_id", e.id)
          .order("name")

        const templates = await getTemplatesForMcpEntity(e.id)
        const typeIdSet = new Set<string>()
        for (const t of templates) {
          if (t.processTypeId) typeIdSet.add(t.processTypeId)
        }

        let processTypes: Array<{ id: string; name: string }> = []
        if (typeIdSet.size > 0) {
          const { data: types } = await supabase
            .from("process_types")
            .select("id, name")
            .in("id", [...typeIdSet])
            .order("name")
          processTypes = types || []
        }

        return {
          id: e.id,
          name: e.name,
          secretaries: secretaries || [],
          processTypes,
        }
      }),
    )

    return NextResponse.json({
      linked: true,
      user: {
        profileId: resolved.user.profileId,
        name: resolved.user.name,
      },
      entities: enriched,
    })
  } catch (err) {
    console.error("[mcp/entities]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al listar entidades" },
      { status: 500 },
    )
  }
}
