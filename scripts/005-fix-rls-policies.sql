-- Fix infinite recursion in RLS policies
-- The issue is that policies on "profiles" table query the same "profiles" table

-- First, drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view profiles in their organization" ON profiles;

-- Create a security definer function to get user role without RLS
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- Create a security definer function to get user organization without RLS
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;

-- Recreate profiles policies using the security definer functions
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Superadmins can view all profiles" ON profiles
  FOR SELECT USING (auth.user_role() = 'superadmin');

CREATE POLICY "Admins can view profiles in their organization" ON profiles
  FOR SELECT USING (
    auth.user_role() = 'admin' 
    AND organization_id = auth.user_organization_id()
  );

-- Also fix policies on other tables that query profiles
DROP POLICY IF EXISTS "Superadmins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

CREATE POLICY "Superadmins can manage all organizations" ON organizations
  FOR ALL USING (auth.user_role() = 'superadmin');

CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (id = auth.user_organization_id());

-- Fix entities policies
DROP POLICY IF EXISTS "Superadmins can manage all entities" ON entities;
DROP POLICY IF EXISTS "Admins can manage entities in their organization" ON entities;
DROP POLICY IF EXISTS "Members can view entities in their organization" ON entities;

CREATE POLICY "Superadmins can manage all entities" ON entities
  FOR ALL USING (auth.user_role() = 'superadmin');

CREATE POLICY "Admins can manage entities in their organization" ON entities
  FOR ALL USING (
    auth.user_role() = 'admin' 
    AND organization_id = auth.user_organization_id()
  );

CREATE POLICY "Members can view entities in their organization" ON entities
  FOR SELECT USING (organization_id = auth.user_organization_id());

-- Fix secretaries policies
DROP POLICY IF EXISTS "Users can view secretaries of their entities" ON secretaries;
DROP POLICY IF EXISTS "Admins can manage secretaries" ON secretaries;

CREATE POLICY "Users can view secretaries of their entities" ON secretaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entities e 
      WHERE e.id = secretaries.entity_id 
      AND e.organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Admins can manage secretaries" ON secretaries
  FOR ALL USING (
    auth.user_role() IN ('admin', 'superadmin')
    AND EXISTS (
      SELECT 1 FROM entities e 
      WHERE e.id = secretaries.entity_id 
      AND e.organization_id = auth.user_organization_id()
    )
  );

-- Fix process types policies
DROP POLICY IF EXISTS "Superadmins can manage process types" ON process_types;

CREATE POLICY "Superadmins can manage process types" ON process_types
  FOR ALL USING (auth.user_role() = 'superadmin');

-- Fix templates policies
DROP POLICY IF EXISTS "Superadmins can manage templates" ON templates;

CREATE POLICY "Superadmins can manage templates" ON templates
  FOR ALL USING (auth.user_role() = 'superadmin');

-- Fix processes policies
DROP POLICY IF EXISTS "Users can view processes of their organization" ON processes;
DROP POLICY IF EXISTS "Members and admins can manage processes" ON processes;

CREATE POLICY "Users can view processes of their organization" ON processes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entities e 
      WHERE e.id = processes.entity_id 
      AND e.organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Members and admins can manage processes" ON processes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM entities e 
      WHERE e.id = processes.entity_id 
      AND e.organization_id = auth.user_organization_id()
    )
  );

-- Fix documents policies
DROP POLICY IF EXISTS "Users can view documents of their processes" ON documents;
DROP POLICY IF EXISTS "Members and admins can manage documents" ON documents;

CREATE POLICY "Users can view documents of their processes" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM processes pr
      JOIN entities e ON e.id = pr.entity_id
      WHERE pr.id = documents.process_id 
      AND e.organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Members and admins can manage documents" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM processes pr
      JOIN entities e ON e.id = pr.entity_id
      WHERE pr.id = documents.process_id 
      AND e.organization_id = auth.user_organization_id()
    )
  );
