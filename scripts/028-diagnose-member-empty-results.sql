-- Diagnóstico: cuando un member hace GET entities/processes y recibe 0 resultados
-- Ejecutar en Supabase SQL Editor (como superuser o con permisos de lectura).

-- 1) Perfil del usuario (reemplaza el id por el sub del JWT si es otro)
-- Si organization_id es NULL o distinto de la org que usa la app, RLS devolverá 0.
SELECT id, email, full_name, role, organization_id
FROM public.profiles
WHERE id = 'cca5a2b0-46ac-46c6-ad27-1ec5424e907a';

-- 2) Entidades de la organización que la app está pidiendo
-- Si esto devuelve 0 filas, es normal que el member vea 0 (no hay datos).
SELECT id, name, organization_id, status
FROM public.entities
WHERE organization_id = 'd204d2bf-1420-4f1c-9624-82d27cfe9506'
ORDER BY name;

-- 3) Procesos de esa organización (vía entidades)
SELECT p.id, p.code, p.entity_id, e.name AS entity_name, e.organization_id
FROM public.processes p
JOIN public.entities e ON e.id = p.entity_id
WHERE e.organization_id = 'd204d2bf-1420-4f1c-9624-82d27cfe9506'
ORDER BY p.updated_at DESC;

-- 4) Comprobar que el member pertenece a esa org (debe coincidir con 1)
-- Si el perfil tiene organization_id = 'd204d2bf-...' y en (2) hay entidades, el member debería verlas.
SELECT
  (SELECT organization_id FROM public.profiles WHERE id = 'cca5a2b0-46ac-46c6-ad27-1ec5424e907a') AS profile_org_id,
  'd204d2bf-1420-4f1c-9624-82d27cfe9506' AS requested_org_id,
  (SELECT organization_id FROM public.profiles WHERE id = 'cca5a2b0-46ac-46c6-ad27-1ec5424e907a') = 'd204d2bf-1420-4f1c-9624-82d27cfe9506' AS org_matches;
