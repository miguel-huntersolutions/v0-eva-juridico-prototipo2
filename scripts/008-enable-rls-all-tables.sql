-- Comprehensive RLS (Row Level Security) enablement for ALL tables
-- This script ensures every table has RLS enabled and proper policies

-- Step 1: Enable RLS on ALL tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 2: Verify security definer functions exist (they should be created by script 006)
-- If not, create them here
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_role' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')) THEN
    CREATE FUNCTION auth.get_my_role()
    RETURNS text
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS '
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ';
    
    GRANT EXECUTE ON FUNCTION auth.get_my_role() TO authenticated;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_organization_id' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')) THEN
    CREATE FUNCTION auth.get_my_organization_id()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS '
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ';
    
    GRANT EXECUTE ON FUNCTION auth.get_my_organization_id() TO authenticated;
  END IF;
END
$$;

-- Step 3: Drop any conflicting policies and recreate clean ones
-- This ensures we have a consistent state

-- PROFILES policies
DROP POLICY IF EXISTS "profiles_view_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_superadmin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;

CREATE POLICY "profiles_view_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_superadmin_select" ON public.profiles
  FOR SELECT USING (auth.get_my_role() = 'superadmin');

CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT USING (
    auth.get_my_role() = 'admin' 
    AND organization_id = auth.get_my_organization_id()
  );

-- ORGANIZATIONS policies
DROP POLICY IF EXISTS "orgs_superadmin_all" ON public.organizations;
DROP POLICY IF EXISTS "orgs_view_own" ON public.organizations;

CREATE POLICY "orgs_superadmin_all" ON public.organizations
  FOR ALL USING (auth.get_my_role() = 'superadmin');

CREATE POLICY "orgs_view_own" ON public.organizations
  FOR SELECT USING (id = auth.get_my_organization_id());

-- ENTITIES policies
DROP POLICY IF EXISTS "entities_superadmin_all" ON public.entities;
DROP POLICY IF EXISTS "entities_admin_manage" ON public.entities;
DROP POLICY IF EXISTS "entities_member_view" ON public.entities;

CREATE POLICY "entities_superadmin_all" ON public.entities
  FOR ALL USING (auth.get_my_role() = 'superadmin');

CREATE POLICY "entities_admin_manage" ON public.entities
  FOR ALL USING (
    auth.get_my_role() = 'admin' 
    AND organization_id = auth.get_my_organization_id()
  );

CREATE POLICY "entities_member_view" ON public.entities
  FOR SELECT USING (organization_id = auth.get_my_organization_id());

-- SECRETARIES policies
DROP POLICY IF EXISTS "secretaries_view" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_manage" ON public.secretaries;

CREATE POLICY "secretaries_view" ON public.secretaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entities e 
      WHERE e.id = secretaries.entity_id 
      AND e.organization_id = auth.get_my_organization_id()
    )
  );

CREATE POLICY "secretaries_manage" ON public.secretaries
  FOR ALL USING (
    auth.get_my_role() IN ('admin', 'superadmin')
    AND EXISTS (
      SELECT 1 FROM public.entities e 
      WHERE e.id = secretaries.entity_id 
      AND (e.organization_id = auth.get_my_organization_id() OR auth.get_my_role() = 'superadmin')
    )
  );

-- PROCESS_TYPES policies
DROP POLICY IF EXISTS "process_types_view_all" ON public.process_types;
DROP POLICY IF EXISTS "process_types_superadmin_manage" ON public.process_types;

CREATE POLICY "process_types_view_all" ON public.process_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "process_types_superadmin_manage" ON public.process_types
  FOR ALL USING (auth.get_my_role() = 'superadmin');

-- TEMPLATES policies
DROP POLICY IF EXISTS "templates_view_all" ON public.templates;
DROP POLICY IF EXISTS "templates_superadmin_manage" ON public.templates;

CREATE POLICY "templates_view_all" ON public.templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "templates_superadmin_manage" ON public.templates
  FOR ALL USING (auth.get_my_role() = 'superadmin');

-- PROCESSES policies
DROP POLICY IF EXISTS "processes_view" ON public.processes;
DROP POLICY IF EXISTS "processes_manage" ON public.processes;

CREATE POLICY "processes_view" ON public.processes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entities e 
      WHERE e.id = processes.entity_id 
      AND e.organization_id = auth.get_my_organization_id()
    )
  );

CREATE POLICY "processes_manage" ON public.processes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.entities e 
      WHERE e.id = processes.entity_id 
      AND e.organization_id = auth.get_my_organization_id()
    )
  );

-- DOCUMENTS policies
DROP POLICY IF EXISTS "documents_view" ON public.documents;
DROP POLICY IF EXISTS "documents_manage" ON public.documents;

CREATE POLICY "documents_view" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.processes pr
      JOIN public.entities e ON e.id = pr.entity_id
      WHERE pr.id = documents.process_id 
      AND e.organization_id = auth.get_my_organization_id()
    )
  );

CREATE POLICY "documents_manage" ON public.documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.processes pr
      JOIN public.entities e ON e.id = pr.entity_id
      WHERE pr.id = documents.process_id 
      AND e.organization_id = auth.get_my_organization_id()
    )
  );

-- CHAT_MESSAGES policies
DROP POLICY IF EXISTS "chat_messages_view_own" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_own" ON public.chat_messages;

CREATE POLICY "chat_messages_view_own" ON public.chat_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "chat_messages_insert_own" ON public.chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Step 4: Verify all tables have RLS enabled
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'organizations', 'entities', 'secretaries', 
                      'process_types', 'templates', 'processes', 'documents', 'chat_messages')
  LOOP
    RAISE NOTICE 'RLS Status for table %: %', 
      table_record.tablename,
      (SELECT relrowsecurity FROM pg_class WHERE relname = table_record.tablename);
  END LOOP;
END
$$;
