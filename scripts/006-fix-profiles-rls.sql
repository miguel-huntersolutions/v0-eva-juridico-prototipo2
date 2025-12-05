-- Drop ALL existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_superadmin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Create a security definer function that bypasses RLS to get user role
-- This function runs as the database owner, not the current user
CREATE OR REPLACE FUNCTION auth.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Create a security definer function to get user's organization_id
CREATE OR REPLACE FUNCTION auth.get_my_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Now create simple, non-recursive policies for profiles

-- 1. Users can always view their own profile (using auth.uid() directly, no recursion)
CREATE POLICY "profiles_view_own"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- 2. Users can update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Users can insert their own profile (for new signups)
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- 4. Superadmins can view all profiles (using security definer function)
CREATE POLICY "profiles_superadmin_select"
ON public.profiles
FOR SELECT
USING (auth.get_my_role() = 'superadmin');

-- 5. Admins can view profiles in their organization (using security definer function)
CREATE POLICY "profiles_admin_select"
ON public.profiles
FOR SELECT
USING (
  auth.get_my_role() = 'admin' 
  AND organization_id = auth.get_my_organization_id()
);

-- Grant execute permission on the functions
GRANT EXECUTE ON FUNCTION auth.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.get_my_organization_id() TO authenticated;
