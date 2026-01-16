-- Allow anonymous users to view active organizations for signup
-- This policy allows unauthenticated users to see organizations so they can select one during registration

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "organizations_public_select" ON public.organizations;

-- Create policy to allow anonymous users to view active organizations
CREATE POLICY "organizations_public_select" ON public.organizations
  FOR SELECT
  USING (status = 'active');

-- Grant SELECT permission to anon role
GRANT SELECT ON public.organizations TO anon;

