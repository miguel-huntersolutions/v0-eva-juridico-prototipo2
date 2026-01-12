-- Allow superadmins to view all profiles
-- This policy uses the get_user_role helper function which is SECURITY DEFINER
-- and can safely query the profiles table without causing recursion

-- Create policy to allow superadmins to select all profiles
CREATE POLICY "profiles_superadmin_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'superadmin'
);

