import { getMcpServiceClient } from "./service-client"
import { normalizePhoneE164 } from "./phone"

export type ChannelType = "telegram" | "whatsapp" | "other"

export type ResolvedMcpUser = {
  profileId: string
  email: string
  name: string
  role: string
  organizationId: string | null
  phone: string | null
}

export async function linkChannelUser(params: {
  channel: ChannelType
  externalId: string
  phone: string
}): Promise<{ ok: true; user: ResolvedMcpUser } | { ok: false; error: string }> {
  const phone = normalizePhoneE164(params.phone)
  if (!phone) {
    return { ok: false, error: "Teléfono inválido. Use formato internacional (+57...)." }
  }

  const supabase = getMcpServiceClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, name, role, organization_id, phone, status")
    .eq("phone", phone)
    .maybeSingle()

  if (error || !profile) {
    return { ok: false, error: "Teléfono no registrado en EVA. Contacte al administrador." }
  }

  if (profile.status && profile.status !== "approved") {
    return { ok: false, error: "Cuenta pendiente de aprobación." }
  }

  const { error: upsertError } = await supabase.from("channel_user_links").upsert(
    {
      channel: params.channel,
      external_id: params.externalId,
      profile_id: profile.id,
      phone,
      active: true,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "channel,external_id" },
  )

  if (upsertError) {
    return { ok: false, error: "No se pudo vincular el canal." }
  }

  return {
    ok: true,
    user: {
      profileId: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      organizationId: profile.organization_id,
      phone,
    },
  }
}

export async function resolveChannelUser(params: {
  channel: ChannelType
  externalId: string
  phone?: string | null
}): Promise<{ ok: true; user: ResolvedMcpUser } | { ok: false; error: string }> {
  const supabase = getMcpServiceClient()

  const { data: link } = await supabase
    .from("channel_user_links")
    .select("profile_id, phone, active")
    .eq("channel", params.channel)
    .eq("external_id", params.externalId)
    .maybeSingle()

  if (link?.active && link.profile_id) {
    const user = await loadProfile(link.profile_id)
    if (user) return { ok: true, user }
  }

  if (params.phone) {
    return linkChannelUser({
      channel: params.channel,
      externalId: params.externalId,
      phone: params.phone,
    })
  }

  return { ok: false, error: "Usuario no vinculado. Comparta su teléfono registrado en EVA." }
}

async function loadProfile(profileId: string): Promise<ResolvedMcpUser | null> {
  const supabase = getMcpServiceClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name, role, organization_id, phone, status")
    .eq("id", profileId)
    .maybeSingle()

  if (!profile || (profile.status && profile.status !== "approved")) return null

  return {
    profileId: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    organizationId: profile.organization_id,
    phone: profile.phone,
  }
}
