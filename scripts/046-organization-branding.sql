-- 046: Datos de contacto y marca (logo y colores) de cada organización.
-- Idempotente: se puede ejecutar más de una vez.
-- Los logos se guardan en el bucket público `entity-logos`, bajo `organizations/<id>/`,
-- y se suben con service role desde /api/organization-settings/logo.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT,
  ADD COLUMN IF NOT EXISTS secondary_color TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_primary_color_hex') THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_primary_color_hex CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9a-fA-F]{6}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_secondary_color_hex') THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_secondary_color_hex CHECK (secondary_color IS NULL OR secondary_color ~ '^#[0-9a-fA-F]{6}$');
  END IF;
END $$;

-- Refresca la caché de esquema de PostgREST para que la API vea las columnas nuevas.
NOTIFY pgrst, 'reload schema';
