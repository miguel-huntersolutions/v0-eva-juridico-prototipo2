-- Disable RLS on profiles table to prevent infinite recursion
-- profiles table cannot have RLS because it's used by other RLS policies

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON profiles;

-- Drop problematic helper functions
DROP FUNCTION IF EXISTS auth.get_my_role();
DROP FUNCTION IF EXISTS auth.get_my_organization_id();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS auth.organization_id();
DROP FUNCTION IF EXISTS get_user_role(uuid);
DROP FUNCTION IF EXISTS get_user_org(uuid);

-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'Failed to disable RLS on profiles table';
    ELSE
        RAISE NOTICE 'RLS successfully disabled on profiles table';
    END IF;
END $$;
