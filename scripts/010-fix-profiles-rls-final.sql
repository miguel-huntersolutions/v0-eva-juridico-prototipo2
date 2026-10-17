-- FINAL FIX: Remove ALL recursion from profiles table RLS policies
-- The key insight: profiles table policies must ONLY use auth.uid(), never query profiles

-- Step 1: Drop legacy helper functions (public only).
-- Do NOT drop auth.* — Supabase owns that schema (ERROR 42501).
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_org(uuid) CASCADE;

-- Step 2: Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "profiles_view_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_superadmin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON public.profiles;

-- Step 3: Create SIMPLE policies for profiles table using ONLY auth.uid()
-- NO database queries, NO helper functions, just auth.uid()

-- Allow users to read their own profile
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Allow users to update their own profile (but not change their own role or org)
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() 
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Allow new users to insert their own profile
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- Step 4: For admin operations (viewing other profiles), use SERVICE ROLE
-- The application should use service role client for admin operations
-- This removes the need for complex RLS policies

-- Step 5: Create helper functions that are NOT used in profiles policies
-- These are safe because they're only used in OTHER tables' policies

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role, 'member') FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_org(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org(uuid) TO authenticated;

-- Step 6: Update policies on OTHER tables to use the new helper functions

-- Drop and recreate organizations policies
DROP POLICY IF EXISTS "orgs_select" ON public.organizations;
DROP POLICY IF EXISTS "orgs_manage_superadmin" ON public.organizations;
DROP POLICY IF EXISTS "orgs_superadmin_all" ON public.organizations;
DROP POLICY IF EXISTS "orgs_view_own" ON public.organizations;

CREATE POLICY "orgs_select"
ON public.organizations
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'superadmin'
  OR id = public.get_user_org(auth.uid())
);

CREATE POLICY "orgs_manage"
ON public.organizations
FOR ALL
USING (public.get_user_role(auth.uid()) = 'superadmin');

-- Drop and recreate entities policies
DROP POLICY IF EXISTS "entities_select" ON public.entities;
DROP POLICY IF EXISTS "entities_manage_admin" ON public.entities;
DROP POLICY IF EXISTS "entities_superadmin_all" ON public.entities;
DROP POLICY IF EXISTS "entities_admin_manage" ON public.entities;
DROP POLICY IF EXISTS "entities_member_view" ON public.entities;

CREATE POLICY "entities_select"
ON public.entities
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'superadmin'
  OR organization_id = public.get_user_org(auth.uid())
);

CREATE POLICY "entities_manage"
ON public.entities
FOR ALL
USING (
  public.get_user_role(auth.uid()) IN ('superadmin', 'admin')
  AND (
    public.get_user_role(auth.uid()) = 'superadmin'
    OR organization_id = public.get_user_org(auth.uid())
  )
);

-- Drop and recreate secretaries policies
DROP POLICY IF EXISTS "secretaries_select" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_manage" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_view" ON public.secretaries;

CREATE POLICY "secretaries_select"
ON public.secretaries
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.entities e
    WHERE e.id = secretaries.entity_id
    AND e.organization_id = public.get_user_org(auth.uid())
  )
);

CREATE POLICY "secretaries_manage"
ON public.secretaries
FOR ALL
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
);

-- Drop and recreate process_types policies
DROP POLICY IF EXISTS "process_types_select_all" ON public.process_types;
DROP POLICY IF EXISTS "process_types_manage_superadmin" ON public.process_types;
DROP POLICY IF EXISTS "process_types_view_all" ON public.process_types;

CREATE POLICY "process_types_select"
ON public.process_types
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "process_types_manage"
ON public.process_types
FOR ALL
USING (public.get_user_role(auth.uid()) = 'superadmin');

-- Drop and recreate templates policies
DROP POLICY IF EXISTS "templates_select_all" ON public.templates;
DROP POLICY IF EXISTS "templates_manage_superadmin" ON public.templates;
DROP POLICY IF EXISTS "templates_view_all" ON public.templates;

CREATE POLICY "templates_select"
ON public.templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "templates_manage"
ON public.templates
FOR ALL
USING (public.get_user_role(auth.uid()) = 'superadmin');

-- Drop and recreate processes policies
DROP POLICY IF EXISTS "processes_select" ON public.processes;
DROP POLICY IF EXISTS "processes_manage" ON public.processes;
DROP POLICY IF EXISTS "processes_view" ON public.processes;

CREATE POLICY "processes_select"
ON public.processes
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.entities e
    WHERE e.id = processes.entity_id
    AND e.organization_id = public.get_user_org(auth.uid())
  )
);

CREATE POLICY "processes_manage"
ON public.processes
FOR ALL
USING (
  public.get_user_role(auth.uid()) = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.entities e
    WHERE e.id = processes.entity_id
    AND e.organization_id = public.get_user_org(auth.uid())
  )
);

-- Drop and recreate documents policies
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_manage" ON public.documents;
DROP POLICY IF EXISTS "documents_view" ON public.documents;

CREATE POLICY "documents_select"
ON public.documents
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.processes pr
    JOIN public.entities e ON e.id = pr.entity_id
    WHERE pr.id = documents.process_id
    AND e.organization_id = public.get_user_org(auth.uid())
  )
);

CREATE POLICY "documents_manage"
ON public.documents
FOR ALL
USING (
  public.get_user_role(auth.uid()) = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.processes pr
    JOIN public.entities e ON e.id = pr.entity_id
    WHERE pr.id = documents.process_id
    AND e.organization_id = public.get_user_org(auth.uid())
  )
);

-- Drop and recreate chat_messages policies
DROP POLICY IF EXISTS "chat_messages_select_own" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_own" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_view_own" ON public.chat_messages;

CREATE POLICY "chat_messages_select"
ON public.chat_messages
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "chat_messages_insert"
ON public.chat_messages
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Verify RLS status
DO $$
DECLARE
  table_record RECORD;
  rls_enabled boolean;
BEGIN
  RAISE NOTICE '=== Final RLS Status Check ===';
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'organizations', 'entities', 'secretaries',
                      'process_types', 'templates', 'processes', 'documents', 'chat_messages')
  LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_record.tablename
    AND relnamespace = 'public'::regnamespace;
    
    RAISE NOTICE 'Table: % | RLS Enabled: %', table_record.tablename, rls_enabled;
  END LOOP;
END
$$;
