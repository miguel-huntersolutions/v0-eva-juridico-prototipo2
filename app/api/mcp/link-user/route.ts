import { NextRequest, NextResponse } from "next/server"
import { assertMcpApiKey } from "@/lib/mcp/auth"
import { McpLinkUserSchema } from "@/lib/mcp/types"
import { linkChannelUser } from "@/lib/mcp/resolve-user"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const auth = assertMcpApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = McpLinkUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 })
    }

    const { channel, externalUserId, phone } = parsed.data
    const result = await linkChannelUser({
      channel,
      externalId: externalUserId,
      phone,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 })
    }

    return NextResponse.json({
      linked: true,
      user: {
        profileId: result.user.profileId,
        name: result.user.name,
        email: result.user.email,
      },
    })
  } catch (err) {
    console.error("[mcp/link-user]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al vincular" },
      { status: 500 },
    )
  }
}
