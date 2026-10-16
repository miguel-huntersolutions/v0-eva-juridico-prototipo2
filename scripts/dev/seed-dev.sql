-- Datos de prueba para la BD de DESARROLLO. Nunca ejecutar en producción.
-- Idempotente: usa IDs fijos y ON CONFLICT DO NOTHING.
-- Los usuarios se crean aparte con scripts/dev/seed-dev-users.mjs (necesita la API de Auth).

BEGIN;

-- Organizaciones
INSERT INTO public.organizations (id, name, nit, status, primary_color, secondary_color, email, phone, address, website) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Bufete Demo Andino', '900000001-1', 'active', '#1e3a8a', '#d97706',
   'contacto@bufete-andino.test', '+57 601 000 0001', 'Calle 100 # 10-20, Bogotá', 'https://bufete-andino.test'),
  ('a0000000-0000-4000-8000-000000000002', 'Consultores Legales del Caribe', '900000002-2', 'active', NULL, NULL,
   'info@legales-caribe.test', '+57 605 000 0002', 'Carrera 54 # 72-10, Barranquilla', NULL)
ON CONFLICT (id) DO NOTHING;

-- Entidades (clientes de cada organización)
INSERT INTO public.entities (id, name, nit, representative_name, organization_id, status) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Alcaldía de Prueba del Norte', '800000001-1', 'Ana Representante', 'a0000000-0000-4000-8000-000000000001', 'active'),
  ('b0000000-0000-4000-8000-000000000002', 'Gobernación Demo', '800000002-2', 'Bruno Representante', 'a0000000-0000-4000-8000-000000000001', 'active'),
  ('b0000000-0000-4000-8000-000000000003', 'Alcaldía de Prueba Costera', '800000003-3', 'Carla Representante', 'a0000000-0000-4000-8000-000000000002', 'active')
ON CONFLICT (id) DO NOTHING;

-- Secretarías
INSERT INTO public.secretaries (id, name, secretary_name, email, phone, entity_id) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'Secretaría de Obras Públicas', 'Diego Secretario', 'obras@alcaldia-norte.test', NULL, 'b0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', 'Secretaría de Educación', 'Elena Secretaria', 'educacion@alcaldia-norte.test', NULL, 'b0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000003', 'Secretaría de Hacienda', 'Fabio Secretario', 'hacienda@gobernacion-demo.test', NULL, 'b0000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000004', 'Secretaría de Salud', 'Gina Secretaria', 'salud@alcaldia-costera.test', NULL, 'b0000000-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- Tipos de proceso (en producción cada organización tiene los suyos)
INSERT INTO public.process_types (id, name, description, organization_id)
SELECT ('d000000' || o.n || '-0000-4000-8000-00000000000' || t.n)::uuid, t.name, t.description, o.id
FROM (VALUES (1, 'a0000000-0000-4000-8000-000000000001'::uuid), (2, 'a0000000-0000-4000-8000-000000000002'::uuid)) AS o(n, id)
CROSS JOIN (VALUES
  (1, 'Contratación Directa', 'Contratación directa según Ley 1150 de 2007'),
  (2, 'Mínima Cuantía', 'Procesos de mínima cuantía'),
  (3, 'Selección Abreviada', 'Selección abreviada de menor cuantía'),
  (4, 'Licitación Pública', 'Licitación pública'),
  (5, 'Concurso de Méritos', 'Concurso de méritos para consultorías')
) AS t(n, name, description)
ON CONFLICT (id) DO NOTHING;

-- Procesos
INSERT INTO public.processes (id, code, object, description, status, entity_id, secretary_id, process_type_id) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'DEMO-AND-2026-001', 'Mantenimiento de vías urbanas', 'Proceso de prueba', 'draft',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'd0000001-0000-4000-8000-000000000004'),
  ('e0000000-0000-4000-8000-000000000002', 'DEMO-AND-2026-002', 'Prestación de servicios profesionales', 'Proceso de prueba', 'in_progress',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'd0000001-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000003', 'DEMO-AND-2026-003', 'Suministro de papelería', 'Proceso de prueba', 'review',
   'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000003', 'd0000001-0000-4000-8000-000000000002'),
  ('e0000000-0000-4000-8000-000000000004', 'DEMO-CAR-2026-001', 'Dotación de centros de salud', 'Proceso de prueba', 'draft',
   'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000004', 'd0000002-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

COMMIT;
