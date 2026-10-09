-- =============================================================================
-- Tenant-scoped superadmins + templates por organización
--
-- Modelo:
--   - superadmin con organization_id IS NULL  → plataforma (ve/gestiona todo)
--   - superadmin con organization_id set      → solo su org (incl. plantillas)
--   - admin / member                          → solo su org (sin gestionar plantillas)
--
-- Run in Supabase SQL Editor after 042.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_superadmin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.role = 'superadmin'
      AND p.organization_id IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_superadmin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.role = 'superadmin'
      AND p.organization_id IS NOT NULL
  );
$$;

-- True if platform superadmin OR the user's organization_id matches org_id
CREATE OR REPLACE FUNCTION public.can_access_organization(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_superadmin(user_id)
    OR (
      org_id IS NOT NULL
      AND public.get_user_org(user_id) = org_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_superadmin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_superadmin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_organization(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) templates.organization_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_templates_organization_id ON public.templates(organization_id);

COMMENT ON COLUMN public.templates.organization_id IS
  'Tenant dueño de la plantilla. NULL = legado/global (solo plataforma escribe; lectura para autenticados).';

-- Backfill desde entity_id cuando exista
UPDATE public.templates t
SET organization_id = e.organization_id
FROM public.entities e
WHERE t.entity_id = e.id
  AND t.organization_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3) ORGANIZATIONS — bypass solo plataforma
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete" ON public.organizations;

CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT USING (
    (auth.uid() IS NULL AND status = 'active')
    OR public.is_platform_superadmin(auth.uid())
    OR id = public.get_user_org(auth.uid())
  );

CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT WITH CHECK (public.is_platform_superadmin(auth.uid()));

CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE USING (
    public.is_platform_superadmin(auth.uid())
    OR id = public.get_user_org(auth.uid())
  );

CREATE POLICY "organizations_delete" ON public.organizations
  FOR DELETE USING (public.is_platform_superadmin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 4) ENTITIES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "entities_select" ON public.entities;
DROP POLICY IF EXISTS "entities_insert" ON public.entities;
DROP POLICY IF EXISTS "entities_update" ON public.entities;
DROP POLICY IF EXISTS "entities_delete" ON public.entities;

CREATE POLICY "entities_select" ON public.entities
  FOR SELECT USING (public.can_access_organization(auth.uid(), organization_id));

CREATE POLICY "entities_insert" ON public.entities
  FOR INSERT WITH CHECK (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
      AND organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "entities_update" ON public.entities
  FOR UPDATE USING (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
      AND organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "entities_delete" ON public.entities
  FOR DELETE USING (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
      AND organization_id = public.get_user_org(auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 5) PROCESS TYPES — solo plataforma gestiona; todos leen
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "process_types_select" ON public.process_types;
DROP POLICY IF EXISTS "process_types_insert" ON public.process_types;
DROP POLICY IF EXISTS "process_types_update" ON public.process_types;
DROP POLICY IF EXISTS "process_types_manage" ON public.process_types;

CREATE POLICY "process_types_select" ON public.process_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "process_types_insert" ON public.process_types
  FOR INSERT WITH CHECK (public.is_platform_superadmin(auth.uid()));

CREATE POLICY "process_types_update" ON public.process_types
  FOR UPDATE USING (public.is_platform_superadmin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 6) TEMPLATES — aislamiento por organización
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "templates_select" ON public.templates;
DROP POLICY IF EXISTS "templates_insert" ON public.templates;
DROP POLICY IF EXISTS "templates_update" ON public.templates;
DROP POLICY IF EXISTS "templates_delete" ON public.templates;
DROP POLICY IF EXISTS "templates_manage" ON public.templates;
DROP POLICY IF EXISTS "Superadmins can manage templates" ON public.templates;

CREATE POLICY "templates_select" ON public.templates
  FOR SELECT USING (
    public.is_platform_superadmin(auth.uid())
    OR organization_id IS NULL  -- legado global
    OR organization_id = public.get_user_org(auth.uid())
  );

CREATE POLICY "templates_insert" ON public.templates
  FOR INSERT WITH CHECK (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.is_org_superadmin(auth.uid())
      AND organization_id = public.get_user_org(auth.uid())
      AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "templates_update" ON public.templates
  FOR UPDATE
  USING (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.is_org_superadmin(auth.uid())
      AND organization_id = public.get_user_org(auth.uid())
    )
  )
  WITH CHECK (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.is_org_superadmin(auth.uid())
      AND organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "templates_delete" ON public.templates
  FOR DELETE USING (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.is_org_superadmin(auth.uid())
      AND organization_id = public.get_user_org(auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 7) SECRETARIES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "secretaries_manage" ON public.secretaries;
DROP POLICY IF EXISTS "Admins can manage secretaries" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_select" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_insert" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_update" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_delete" ON public.secretaries;

CREATE POLICY "secretaries_select" ON public.secretaries
  FOR SELECT USING (
    public.is_platform_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.id = secretaries.entity_id
        AND e.organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "secretaries_insert" ON public.secretaries
  FOR INSERT WITH CHECK (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
      AND EXISTS (
        SELECT 1 FROM public.entities e
        WHERE e.id = entity_id
          AND e.organization_id = public.get_user_org(auth.uid())
      )
    )
  );

CREATE POLICY "secretaries_update" ON public.secretaries
  FOR UPDATE
  USING (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
      AND EXISTS (
        SELECT 1 FROM public.entities e
        WHERE e.id = secretaries.entity_id
          AND e.organization_id = public.get_user_org(auth.uid())
      )
    )
  )
  WITH CHECK (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
      AND EXISTS (
        SELECT 1 FROM public.entities e
        WHERE e.id = secretaries.entity_id
          AND e.organization_id = public.get_user_org(auth.uid())
      )
    )
  );

CREATE POLICY "secretaries_delete" ON public.secretaries
  FOR DELETE USING (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
      AND EXISTS (
        SELECT 1 FROM public.entities e
        WHERE e.id = secretaries.entity_id
          AND e.organization_id = public.get_user_org(auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 8) PROCESSES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "processes_select" ON public.processes;
DROP POLICY IF EXISTS "processes_insert" ON public.processes;
DROP POLICY IF EXISTS "processes_update" ON public.processes;
DROP POLICY IF EXISTS "processes_delete" ON public.processes;

CREATE POLICY "processes_select" ON public.processes
  FOR SELECT USING (
    public.is_platform_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.id = processes.entity_id
        AND e.organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "processes_insert" ON public.processes
  FOR INSERT WITH CHECK (
    public.is_platform_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.id = entity_id
        AND e.organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "processes_update" ON public.processes
  FOR UPDATE USING (
    public.is_platform_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.id = processes.entity_id
        AND e.organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "processes_delete" ON public.processes
  FOR DELETE USING (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
      AND EXISTS (
        SELECT 1 FROM public.entities e
        WHERE e.id = processes.entity_id
          AND e.organization_id = public.get_user_org(auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 9) DOCUMENTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;

CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (
    public.is_platform_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.processes p
      JOIN public.entities e ON e.id = p.entity_id
      WHERE p.id = documents.process_id
        AND e.organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (
    public.is_platform_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.processes p
      JOIN public.entities e ON e.id = p.entity_id
      WHERE p.id = process_id
        AND e.organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE USING (
    public.is_platform_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.processes p
      JOIN public.entities e ON e.id = p.entity_id
      WHERE p.id = documents.process_id
        AND e.organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE USING (
    public.is_platform_superadmin(auth.uid())
    OR (
      public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
      AND EXISTS (
        SELECT 1
        FROM public.processes p
        JOIN public.entities e ON e.id = p.entity_id
        WHERE p.id = documents.process_id
          AND e.organization_id = public.get_user_org(auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
SELECT 'helpers' AS section, proname
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('is_platform_superadmin', 'is_org_superadmin', 'can_access_organization')
ORDER BY proname;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'organization_id';

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'entities', 'templates', 'secretaries', 'processes', 'documents', 'process_types')
ORDER BY tablename, policyname;
