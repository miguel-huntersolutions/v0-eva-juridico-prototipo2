-- Allow anonymous users to view active organizations for signup
-- This policy allows unauthenticated users to see organizations so they can select one during registration

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "organizations_public_select" ON public.organizations;

-- Grant SELECT permission to anon role first
GRANT SELECT ON public.organizations TO anon;

-- Create policy to allow anonymous users to view active organizations
-- This policy must allow access when auth.uid() is NULL (anonymous users)
CREATE POLICY "organizations_public_select" ON public.organizations
  FOR SELECT
  USING (
    -- Allow if user is anonymous (not authenticated) AND organization is active
    (auth.uid() IS NULL AND status = 'active')
    OR
    -- Also allow if user is authenticated and meets other criteria (for compatibility)
    (auth.uid() IS NOT NULL AND (
      -- This will be handled by other policies, but we include it for completeness
      status = 'active'
    ))
  );

