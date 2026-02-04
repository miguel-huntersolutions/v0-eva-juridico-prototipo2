-- Debug: mismo flujo que GET /api/get-member-entities para un memberId
-- Ejecutar en Supabase SQL Editor para ver perfil y asignaciones de entidades.
-- Cambia el UUID si quieres revisar otro miembro.

-- 1) Perfil del miembro (equivalente a la query del API)
SELECT
  id,
  name,
  email,
  role,
  organization_id,
  status
FROM profiles
WHERE id = '59cc03f8-6337-4298-8b45-b87dd510d906';

-- 2) Filas en member_entities para este member_id (lo que devuelve el API como entityIds)
SELECT
  id,
  member_id,
  entity_id,
  created_at,
  updated_at
FROM member_entities
WHERE member_id = '59cc03f8-6337-4298-8b45-b87dd510d906';

-- 3) Mismo resultado pero con nombre de entidad y organización (para revisar que las entidades existan y sean de la misma org)
SELECT
  me.id,
  me.member_id,
  me.entity_id,
  e.name AS entity_name,
  e.organization_id AS entity_organization_id,
  o.name AS organization_name
FROM member_entities me
LEFT JOIN entities e ON e.id = me.entity_id
LEFT JOIN organizations o ON o.id = e.organization_id
WHERE me.member_id = '59cc03f8-6337-4298-8b45-b87dd510d906';

-- 4) Entidades de la organización del miembro (para comparar: cuántas entidades hay en la org vs cuántas asignadas)
SELECT
  e.id,
  e.name,
  e.organization_id
FROM entities e
WHERE e.organization_id = (
  SELECT organization_id FROM profiles WHERE id = '59cc03f8-6337-4298-8b45-b87dd510d906'
)
ORDER BY e.name;
