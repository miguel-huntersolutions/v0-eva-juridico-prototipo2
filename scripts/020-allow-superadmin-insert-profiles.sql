-- Allow superadmins to insert profiles for new members
-- This policy allows users with role 'superadmin' to create profiles for other users

-- Security definer helper in public (auth schema is not writable on hosted Supabase)
CREATE OR REPLACE FUNCTION public.is_superadmin()
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

GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

CREATE POLICY "profiles_insert_superadmin"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin() = true);

CREATE POLICY "profiles_update_superadmin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_superadmin() = true)
WITH CHECK (public.is_superadmin() = true);

