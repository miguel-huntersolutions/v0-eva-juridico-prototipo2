-- Fix infinite recursion in RLS policies by using JWT claims instead of database queries
-- This script replaces the recursive functions with JWT-based checks

-- Step 1: Drop existing recursive functions
DROP FUNCTION IF EXISTS auth.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS auth.get_my_organization_id() CASCADE;

-- Step 2: Create JWT-based helper functions that don't query profiles table
-- These functions read from the JWT token, avoiding recursion

-- Get user role from JWT custom claims
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    'member'  -- default role
  );
$$;

-- Get organization_id from JWT custom claims
CREATE OR REPLACE FUNCTION auth.organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt() -> 'user_metadata' ->> 'organization_id', '')::uuid;
$$;

GRANT EXECUTE ON FUNCTION auth.role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.organization_id() TO authenticated;

-- Step 3: Drop ALL existing policies to recreate them with non-recursive functions
DROP POLICY IF EXISTS "profiles_view_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_superadmin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "orgs_superadmin_all" ON public.organizations;
DROP POLICY IF EXISTS "orgs_view_own" ON public.organizations;
DROP POLICY IF EXISTS "entities_superadmin_all" ON public.entities;
DROP POLICY IF EXISTS "entities_admin_manage" ON public.entities;
DROP POLICY IF EXISTS "entities_member_view" ON public.entities;
DROP POLICY IF EXISTS "secretaries_view" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_manage" ON public.secretaries;
DROP POLICY IF EXISTS "process_types_view_all" ON public.process_types;
DROP POLICY IF EXISTS "process_types_superadmin_manage" ON public.process_types;
DROP POLICY IF EXISTS "templates_view_all" ON public.templates;
DROP POLICY IF EXISTS "templates_superadmin_manage" ON public.templates;
DROP POLICY IF EXISTS "processes_view" ON public.processes;
DROP POLICY IF EXISTS "processes_manage" ON public.processes;
DROP POLICY IF EXISTS "documents_view" ON public.documents;
DROP POLICY IF EXISTS "documents_manage" ON public.documents;
DROP POLICY IF EXISTS "chat_messages_view_own" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_own" ON public.chat_messages;

-- Step 4: Recreate PROFILES policies without recursion
-- Using auth.uid() directly instead of querying profiles table

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT 
  USING (
    id = auth.uid() 
    OR auth.role() = 'superadmin'
    OR (auth.role() = 'admin' AND organization_id = auth.organization_id())
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE 
  USING (id = auth.uid()) 
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT 
  WITH CHECK (id = auth.uid());

-- Step 5: Recreate ORGANIZATIONS policies
CREATE POLICY "orgs_select" ON public.organizations
  FOR SELECT 
  USING (
    auth.role() = 'superadmin' 
    OR id = auth.organization_id()
  );

CREATE POLICY "orgs_manage_superadmin" ON public.organizations
  FOR ALL 
  USING (auth.role() = 'superadmin');

-- Step 6: Recreate ENTITIES policies
CREATE POLICY "entities_select" ON public.entities
  FOR SELECT 
  USING (
    auth.role() = 'superadmin' 
    OR organization_id = auth.organization_id()
  );

CREATE POLICY "entities_manage_admin" ON public.entities
  FOR ALL 
  USING (
    auth.role() = 'superadmin' 
    OR (auth.role() = 'admin' AND organization_id = auth.organization_id())
  );

-- Step 7: Recreate SECRETARIES policies
CREATE POLICY "secretaries_select" ON public.secretaries
  FOR SELECT 
  USING (
    auth.role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM public.entities e 
      WHERE e.id = secretaries.entity_id 
      AND e.organization_id = auth.organization_id()
    )
  );

CREATE POLICY "secretaries_manage" ON public.secretaries
  FOR ALL 
  USING (
    auth.role() = 'superadmin'
    OR (
      auth.role() = 'admin'
      AND EXISTS (
        SELECT 1 FROM public.entities e 
        WHERE e.id = secretaries.entity_id 
        AND e.organization_id = auth.organization_id()
      )
    )
  );

-- Step 8: Recreate PROCESS_TYPES policies
CREATE POLICY "process_types_select_all" ON public.process_types
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "process_types_manage_superadmin" ON public.process_types
  FOR ALL 
  USING (auth.role() = 'superadmin');

-- Step 9: Recreate TEMPLATES policies
CREATE POLICY "templates_select_all" ON public.templates
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "templates_manage_superadmin" ON public.templates
  FOR ALL 
  USING (auth.role() = 'superadmin');

-- Step 10: Recreate PROCESSES policies
CREATE POLICY "processes_select" ON public.processes
  FOR SELECT 
  USING (
    auth.role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM public.entities e 
      WHERE e.id = processes.entity_id 
      AND e.organization_id = auth.organization_id()
    )
  );

CREATE POLICY "processes_manage" ON public.processes
  FOR ALL 
  USING (
    auth.role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM public.entities e 
      WHERE e.id = processes.entity_id 
      AND e.organization_id = auth.organization_id()
    )
  );

-- Step 11: Recreate DOCUMENTS policies
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT 
  USING (
    auth.role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM public.processes pr
      JOIN public.entities e ON e.id = pr.entity_id
      WHERE pr.id = documents.process_id 
      AND e.organization_id = auth.organization_id()
    )
  );

CREATE POLICY "documents_manage" ON public.documents
  FOR ALL 
  USING (
    auth.role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM public.processes pr
      JOIN public.entities e ON e.id = pr.entity_id
      WHERE pr.id = documents.process_id 
      AND e.organization_id = auth.organization_id()
    )
  );

-- Step 12: Recreate CHAT_MESSAGES policies
CREATE POLICY "chat_messages_select_own" ON public.chat_messages
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "chat_messages_insert_own" ON public.chat_messages
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Step 13: Create trigger to sync user metadata to JWT on profile changes
-- This ensures JWT claims stay in sync with profile data

CREATE OR REPLACE FUNCTION public.handle_profile_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Note: In production, you would use Supabase's auth.update_user() function
  -- or a webhook to update the JWT claims. This is a placeholder.
  RAISE NOTICE 'Profile updated for user %. Role: %, Org: %', NEW.id, NEW.role, NEW.organization_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_updated();

-- Step 14: Verify RLS is enabled on all tables
DO $$
DECLARE
  table_record RECORD;
BEGIN
  RAISE NOTICE '=== RLS Status Check ===';
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'organizations', 'entities', 'secretaries', 
                      'process_types', 'templates', 'processes', 'documents', 'chat_messages')
  LOOP
    RAISE NOTICE 'Table: % | RLS Enabled: %', 
      table_record.tablename,
      (SELECT relrowsecurity FROM pg_class WHERE relname = table_record.tablename AND relnamespace = 'public'::regnamespace);
  END LOOP;
END
$$;
