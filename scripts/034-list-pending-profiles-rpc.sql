-- Lista perfiles pending para superadmin sin depender de service_role ni de RLS SELECT amplio.
-- Ejecutar en SQL Editor de Supabase si /api/pending-users devuelve lista vacía o permission denied.

CREATE OR REPLACE FUNCTION public.list_pending_profiles()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role text,
  status text,
  organization_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: superadmin only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, p.name, p.email, p.role, p.status, p.organization_id, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.status = 'pending'
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_pending_profiles() TO authenticated;
