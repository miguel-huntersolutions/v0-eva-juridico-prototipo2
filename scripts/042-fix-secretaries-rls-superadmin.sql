-- Fix secretaries RLS so superadmin can manage secretaries of any organization.
-- Mirrors the bypass already used in entities_insert / entities_update / entities_delete.
-- Run in Supabase SQL Editor.

-- Drop legacy + current write policies (avoid overlap with FOR ALL)
DROP POLICY IF EXISTS "secretaries_manage" ON public.secretaries;
DROP POLICY IF EXISTS "Admins can manage secretaries" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_insert" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_update" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_delete" ON public.secretaries;

-- Keep select as-is if already correct; recreate for consistency
DROP POLICY IF EXISTS "secretaries_select" ON public.secretaries;
DROP POLICY IF EXISTS "Users can view secretaries of their entities" ON public.secretaries;

CREATE POLICY "secretaries_select" ON public.secretaries
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.id = secretaries.entity_id
        AND e.organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "secretaries_insert" ON public.secretaries
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
    AND (
      public.get_user_role(auth.uid()) = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM public.entities e
        WHERE e.id = entity_id
          AND e.organization_id = public.get_user_org(auth.uid())
      )
    )
  );

CREATE POLICY "secretaries_update" ON public.secretaries
  FOR UPDATE
  USING (
    public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
    AND (
      public.get_user_role(auth.uid()) = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM public.entities e
        WHERE e.id = secretaries.entity_id
          AND e.organization_id = public.get_user_org(auth.uid())
      )
    )
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
    AND (
      public.get_user_role(auth.uid()) = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM public.entities e
        WHERE e.id = secretaries.entity_id
          AND e.organization_id = public.get_user_org(auth.uid())
      )
    )
  );

CREATE POLICY "secretaries_delete" ON public.secretaries
  FOR DELETE USING (
    public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
    AND (
      public.get_user_role(auth.uid()) = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM public.entities e
        WHERE e.id = secretaries.entity_id
          AND e.organization_id = public.get_user_org(auth.uid())
      )
    )
  );

-- Verify
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'secretaries'
ORDER BY policyname;
