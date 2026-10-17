-- MCP / canales externos (Telegram, WhatsApp): teléfono en perfil + vínculo por canal

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
  ON public.profiles (phone)
  WHERE phone IS NOT NULL AND phone <> '';

COMMENT ON COLUMN public.profiles.phone IS 'Teléfono E.164 (+57...) para vincular canales externos';

CREATE TABLE IF NOT EXISTS public.channel_user_links (
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'other')),
  external_id TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (channel, external_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_user_links_profile
  ON public.channel_user_links (profile_id);

ALTER TABLE public.channel_user_links ENABLE ROW LEVEL SECURITY;

-- Solo service role / backend MCP gestiona vínculos (sin políticas para authenticated)
