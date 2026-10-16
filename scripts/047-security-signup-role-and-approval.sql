-- 047: Seguridad de registro y aprobación de usuarios.
--
-- 1. El rol ya no se toma del metadata del registro: todo usuario nuevo nace
--    role='member', status='pending'. El rol real lo asigna un admin
--    (create-member / update-member, con service role).
-- 2. Un perfil no aprobado no tiene rol ni organización a efectos de RLS:
--    get_user_role/get_user_org devuelven NULL y los helpers de superadmin
--    devuelven false si status <> 'approved'.
-- 3. Un usuario no puede cambiar su propio status ni entity_id, y solo puede
--    crear su perfil como member + pending.
--
-- Idempotente. Se ejecuta en una sola transacción.

BEGIN;

-- 1. Trigger de registro --------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  -- La organización elegida al registrarse se conserva para el flujo de
  -- aprobación, solo si existe y está activa. No da acceso mientras el
  -- perfil esté pendiente.
  BEGIN
    org_id := NULLIF(TRIM(NEW.raw_user_meta_data->>'organization_id'), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    org_id := NULL;
  END;
  IF org_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.status = 'active') THEN
    org_id := NULL;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, status, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    'member',   -- nunca desde raw_user_meta_data: lo controla quien se registra
    'pending',
    org_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Helpers usados por RLS: solo perfiles aprobados ------------------------
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role FROM public.profiles p
  WHERE p.id = user_id AND p.status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.get_user_org(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.organization_id FROM public.profiles p
  WHERE p.id = user_id AND p.status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.is_platform_superadmin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
      AND p.role = 'superadmin'
      AND p.organization_id IS NULL
      AND p.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_superadmin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
      AND p.role = 'superadmin'
      AND p.organization_id IS NOT NULL
      AND p.status = 'approved'
  );
$$;

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
      AND status = 'approved'
  );
$$;

-- 3. Políticas propias de profiles -----------------------------------------
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role            IS NOT DISTINCT FROM (SELECT p.role            FROM public.profiles p WHERE p.id = auth.uid())
    AND organization_id IS NOT DISTINCT FROM (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND status          IS NOT DISTINCT FROM (SELECT p.status          FROM public.profiles p WHERE p.id = auth.uid())
    AND entity_id       IS NOT DISTINCT FROM (SELECT p.entity_id       FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role = 'member'
    AND status = 'pending'
    AND entity_id IS NULL
  );

COMMIT;

-- Recarga la caché de PostgREST (firmas de funciones RPC).
NOTIFY pgrst, 'reload schema';
