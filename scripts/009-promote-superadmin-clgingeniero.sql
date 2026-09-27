-- =============================================================================
-- Promover clgingeniero@gmail.com a superadmin (+ crear profile si falta)
-- Ejecutar en Supabase SQL Editor
-- =============================================================================
-- Si el usuario NO existe en Authentication, créalo primero:
--   Authentication → Users → Add user → clgingeniero@gmail.com (Auto Confirm)
-- Luego ejecuta este script de nuevo.
-- =============================================================================

-- 1) Diagnóstico
SELECT 'auth.users' AS origen, id::text, email, created_at::text
FROM auth.users
WHERE email = 'clgingeniero@gmail.com';

SELECT 'profiles' AS origen, id::text, email, role, status, organization_id::text
FROM public.profiles
WHERE email = 'clgingeniero@gmail.com';

-- 2) Crear o actualizar profile (solo si existe en auth.users)
INSERT INTO public.profiles (id, name, email, role, status, organization_id)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', 'clgingeniero'),
  u.email,
  'superadmin',
  'approved',
  '11111111-1111-1111-1111-111111111111'::uuid
FROM auth.users u
WHERE u.email = 'clgingeniero@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  status = 'approved',
  organization_id = '11111111-1111-1111-1111-111111111111'::uuid,
  email = EXCLUDED.email,
  updated_at = NOW();

-- 3) Resultado
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'clgingeniero@gmail.com')
      THEN 'FALTA USUARIO: créalo en Authentication → Users → Add user'
    WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'clgingeniero@gmail.com')
      THEN 'ERROR: auth existe pero profile no se pudo crear'
    ELSE 'OK: ' || p.role || ' / ' || p.status
  END AS resultado,
  p.id,
  p.email,
  p.role,
  p.status,
  o.name AS organizacion
FROM public.profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.email = 'clgingeniero@gmail.com';
