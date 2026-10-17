-- =============================================================================
-- process_types por organización
-- - organization_id NULL  → catálogo compartido (visible a todos)
-- - organization_id = org → solo esa organización (y plataforma)
--
-- Backfill: tipos usados por una sola org pasan a ser de esa org
-- (evita que "Contrato … EMPEN" de un tenant aparezca en otro).
-- =============================================================================

ALTER TABLE public.process_types
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_process_types_organization_id
  ON public.process_types(organization_id);

COMMENT ON COLUMN public.process_types.organization_id IS
  'NULL = tipo compartido de plataforma. UUID = exclusivo de esa organización.';

-- Asignar a la org los tipos que solo esa org ha usado (templates / processes)
WITH type_orgs AS (
  SELECT t.process_type_id, t.organization_id AS org_id
  FROM public.templates t
  WHERE t.process_type_id IS NOT NULL
    AND t.organization_id IS NOT NULL
  UNION
  SELECT t.process_type_id, e.organization_id
  FROM public.templates t
  JOIN public.entities e ON e.id = t.entity_id
  WHERE t.process_type_id IS NOT NULL
  UNION
  SELECT p.process_type_id, e.organization_id
  FROM public.processes p
  JOIN public.entities e ON e.id = p.entity_id
  WHERE p.process_type_id IS NOT NULL
),
counts AS (
  SELECT
    process_type_id,
    COUNT(DISTINCT org_id) AS n_orgs,
    (ARRAY_AGG(DISTINCT org_id))[1] AS only_org
  FROM type_orgs
  GROUP BY process_type_id
)
UPDATE public.process_types pt
SET organization_id = c.only_org
FROM counts c
WHERE pt.id = c.process_type_id
  AND c.n_orgs = 1
  AND pt.organization_id IS NULL;

-- RLS
DROP POLICY IF EXISTS "process_types_select" ON public.process_types;
DROP POLICY IF EXISTS "process_types_insert" ON public.process_types;
DROP POLICY IF EXISTS "process_types_update" ON public.process_types;
DROP POLICY IF EXISTS "process_types_delete" ON public.process_types;
DROP POLICY IF EXISTS "process_types_manage" ON public.process_types;

CREATE POLICY "process_types_select" ON public.process_types
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      public.is_platform_superadmin(auth.uid())
      OR organization_id IS NULL
      OR organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "process_types_insert" ON public.process_types
  FOR INSERT WITH CHECK (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.is_org_superadmin(auth.uid())
      AND organization_id = public.get_user_org(auth.uid())
      AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "process_types_update" ON public.process_types
  FOR UPDATE USING (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.is_org_superadmin(auth.uid())
      AND organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "process_types_delete" ON public.process_types
  FOR DELETE USING (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.is_org_superadmin(auth.uid())
      AND organization_id = public.get_user_org(auth.uid())
    )
  );

-- Verify
SELECT id, name, organization_id
FROM public.process_types
ORDER BY name;
