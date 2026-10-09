-- =============================================================================
-- Periodos de ley de garantías por organización (tenant)
--
-- Antes: globales, solo superadmin de plataforma.
-- Ahora: propios de cada organización; los gestiona el org-superadmin.
--
-- Run in Supabase SQL Editor after 044.
-- =============================================================================

ALTER TABLE public.guarantee_law_periods
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_guarantee_law_periods_organization_id
  ON public.guarantee_law_periods(organization_id);

COMMENT ON COLUMN public.guarantee_law_periods.organization_id IS
  'Tenant dueño del periodo. NULL = legado global (solo lectura; no se crean nuevos sin org).';

-- Lectura: autenticados ven periodos de su org + legado global (organization_id NULL)
DROP POLICY IF EXISTS guarantee_law_periods_select ON guarantee_law_periods;
CREATE POLICY guarantee_law_periods_select ON guarantee_law_periods
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      organization_id IS NULL
      OR public.can_access_organization(auth.uid(), organization_id)
    )
  );
