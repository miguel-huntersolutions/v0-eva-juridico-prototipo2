-- Allow superadmins to insert profiles for new members
-- This policy allows users with role 'superadmin' to create profiles for other users

-- First, create a security definer function to check if current user is superadmin
-- This function runs with elevated privileges to check the role
CREATE OR REPLACE FUNCTION auth.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'superadmin'
  )
$$;

-- Create policy to allow superadmins to insert profiles
CREATE POLICY "profiles_insert_superadmin"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_superadmin() = true
);

-- Also allow superadmins to update profiles (to set organization_id, role, etc.)
CREATE POLICY "profiles_update_superadmin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.is_superadmin() = true)
WITH CHECK (auth.is_superadmin() = true);

