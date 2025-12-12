-- Recreate RLS policies for other tables (non-profiles)
-- These policies will work now that profiles table doesn't have RLS

-- Enable RLS on all tables except profiles
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;
DROP POLICY IF EXISTS "organizations_delete" ON organizations;

DROP POLICY IF EXISTS "entities_select" ON entities;
DROP POLICY IF EXISTS "entities_insert" ON entities;
DROP POLICY IF EXISTS "entities_update" ON entities;
DROP POLICY IF EXISTS "entities_delete" ON entities;

DROP POLICY IF EXISTS "process_types_select" ON process_types;
DROP POLICY IF EXISTS "process_types_insert" ON process_types;
DROP POLICY IF EXISTS "process_types_update" ON process_types;

DROP POLICY IF EXISTS "templates_select" ON templates;
DROP POLICY IF EXISTS "templates_insert" ON templates;
DROP POLICY IF EXISTS "templates_update" ON templates;

DROP POLICY IF EXISTS "processes_select" ON processes;
DROP POLICY IF EXISTS "processes_insert" ON processes;
DROP POLICY IF EXISTS "processes_update" ON processes;
DROP POLICY IF EXISTS "processes_delete" ON processes;

DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;

DROP POLICY IF EXISTS "secretaries_select" ON secretaries;
DROP POLICY IF EXISTS "secretaries_insert" ON secretaries;
DROP POLICY IF EXISTS "secretaries_update" ON secretaries;
DROP POLICY IF EXISTS "secretaries_delete" ON secretaries;

-- Helper function to get user role (safe now that profiles has no RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = user_id;
    RETURN COALESCE(user_role, 'member');
END;
$$;

-- Helper function to get user organization (safe now)
CREATE OR REPLACE FUNCTION public.get_user_org(user_id uuid)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id FROM profiles WHERE id = user_id;
    RETURN org_id;
END;
$$;

-- ORGANIZATIONS POLICIES
CREATE POLICY "organizations_select" ON organizations
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        id = get_user_org(auth.uid())
    );

CREATE POLICY "organizations_insert" ON organizations
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) = 'superadmin'
    );

CREATE POLICY "organizations_update" ON organizations
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        id = get_user_org(auth.uid())
    );

CREATE POLICY "organizations_delete" ON organizations
    FOR DELETE USING (
        get_user_role(auth.uid()) = 'superadmin'
    );

-- ENTITIES POLICIES
CREATE POLICY "entities_select" ON entities
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        organization_id = get_user_org(auth.uid())
    );

CREATE POLICY "entities_insert" ON entities
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        (get_user_role(auth.uid()) = 'superadmin' OR organization_id = get_user_org(auth.uid()))
    );

CREATE POLICY "entities_update" ON entities
    FOR UPDATE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        (get_user_role(auth.uid()) = 'superadmin' OR organization_id = get_user_org(auth.uid()))
    );

CREATE POLICY "entities_delete" ON entities
    FOR DELETE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        (get_user_role(auth.uid()) = 'superadmin' OR organization_id = get_user_org(auth.uid()))
    );

-- PROCESS TYPES POLICIES
CREATE POLICY "process_types_select" ON process_types
    FOR SELECT USING (true);

CREATE POLICY "process_types_insert" ON process_types
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) = 'superadmin'
    );

CREATE POLICY "process_types_update" ON process_types
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'superadmin'
    );

-- TEMPLATES POLICIES
CREATE POLICY "templates_select" ON templates
    FOR SELECT USING (true);

CREATE POLICY "templates_insert" ON templates
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) = 'superadmin'
    );

CREATE POLICY "templates_update" ON templates
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'superadmin'
    );

-- PROCESSES POLICIES
CREATE POLICY "processes_select" ON processes
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = processes.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "processes_insert" ON processes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "processes_update" ON processes
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = processes.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "processes_delete" ON processes
    FOR DELETE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = processes.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

-- DOCUMENTS POLICIES
CREATE POLICY "documents_select" ON documents
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM processes p
            JOIN entities e ON e.id = p.entity_id
            WHERE p.id = documents.process_id 
            AND e.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "documents_insert" ON documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM processes p
            JOIN entities e ON e.id = p.entity_id
            WHERE p.id = process_id 
            AND e.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "documents_update" ON documents
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM processes p
            JOIN entities e ON e.id = p.entity_id
            WHERE p.id = documents.process_id 
            AND e.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "documents_delete" ON documents
    FOR DELETE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        EXISTS (
            SELECT 1 FROM processes p
            JOIN entities e ON e.id = p.entity_id
            WHERE p.id = documents.process_id 
            AND e.organization_id = get_user_org(auth.uid())
        )
    );

-- SECRETARIES POLICIES
CREATE POLICY "secretaries_select" ON secretaries
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = secretaries.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "secretaries_insert" ON secretaries
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "secretaries_update" ON secretaries
    FOR UPDATE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = secretaries.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "secretaries_delete" ON secretaries
    FOR DELETE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = secretaries.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

-- Verify all policies are created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
