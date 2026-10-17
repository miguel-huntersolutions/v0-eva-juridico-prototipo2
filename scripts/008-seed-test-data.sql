-- =============================================================================
-- EVA Jurídico — Datos de prueba + superadmin clgingeniero@gmail.com
-- =============================================================================
-- Requisito: el usuario debe existir en Supabase → Authentication.
-- Si aún no se registró, créalo en la app y vuelve a ejecutar solo la sección H.
-- =============================================================================

-- --- Organizaciones ---
INSERT INTO organizations (id, name, nit, status, created_at, updated_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Bufete García & Asociados', '900.123.456-1', 'active', '2024-01-15', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Consultores Jurídicos del Norte', '900.789.012-3', 'active', '2024-02-20', NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Asesores Legales Medellín', '900.345.678-9', 'active', '2024-03-10', NOW()),
  ('44444444-4444-4444-4444-444444444444', 'Firma Jurídica Caribe', '900.901.234-5', 'inactive', '2024-04-05', NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  nit = EXCLUDED.nit,
  status = EXCLUDED.status,
  updated_at = NOW();

-- --- Tipos de proceso ---
INSERT INTO process_types (id, name, description, created_at, updated_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Contratación Directa', 'Proceso de contratación directa según el artículo 2 de la Ley 1150 de 2007', NOW(), NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Licitación Pública', 'Proceso de licitación pública para contratos de mayor cuantía', NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Selección Abreviada', 'Proceso de selección abreviada de menor cuantía', NOW(), NOW()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Concurso de Méritos', 'Proceso para contratación de consultoría', NOW(), NOW()),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Mínima Cuantía', 'Proceso simplificado para adquisiciones de menor valor', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- --- Plantillas (UUIDs válidos) ---
INSERT INTO templates (id, name, process_type_id, file_url, created_at, updated_at) VALUES
  ('10000001-0001-4001-8001-000000000001', 'Estudios Previos - Contratación Directa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '/templates/estudios-previos-cd.docx', '2024-01-10', NOW()),
  ('10000001-0001-4001-8001-000000000002', 'Análisis del Sector - Contratación Directa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '/templates/analisis-sector-cd.docx', '2024-01-12', NOW()),
  ('10000001-0001-4001-8001-000000000003', 'Minuta del Contrato - Contratación Directa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '/templates/minuta-contrato-cd.docx', '2024-01-14', NOW()),
  ('10000001-0001-4001-8001-000000000004', 'Pliego de Condiciones - Licitación', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '/templates/pliego-condiciones-lp.docx', '2024-01-12', NOW()),
  ('10000001-0001-4001-8001-000000000005', 'Estudios Previos - Licitación Pública', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '/templates/estudios-previos-lp.docx', '2024-01-13', NOW()),
  ('10000001-0001-4001-8001-000000000006', 'Anexo Técnico - Licitación Pública', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '/templates/anexo-tecnico-lp.docx', '2024-01-15', NOW()),
  ('10000001-0001-4001-8001-000000000007', 'Acta de Apertura - Licitación Pública', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '/templates/acta-apertura-lp.docx', '2024-01-16', NOW()),
  ('10000001-0001-4001-8001-000000000008', 'Estudios Previos - Selección Abreviada', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '/templates/estudios-previos-sa.docx', '2024-01-15', NOW()),
  ('10000001-0001-4001-8001-000000000009', 'Invitación Pública - Selección Abreviada', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '/templates/invitacion-publica-sa.docx', '2024-01-17', NOW()),
  ('10000001-0001-4001-8001-00000000000a', 'Términos de Referencia - Concurso', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '/templates/terminos-referencia-cm.docx', '2024-01-18', NOW()),
  ('10000001-0001-4001-8001-00000000000b', 'Matriz de Evaluación - Concurso', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '/templates/matriz-evaluacion-cm.docx', '2024-01-20', NOW()),
  ('10000001-0001-4001-8001-00000000000c', 'Invitación - Mínima Cuantía', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '/templates/invitacion-mc.docx', '2024-01-20', NOW()),
  ('10000001-0001-4001-8001-00000000000d', 'Aceptación de Oferta - Mínima Cuantía', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '/templates/aceptacion-oferta-mc.docx', '2024-01-22', NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  process_type_id = EXCLUDED.process_type_id,
  file_url = EXCLUDED.file_url,
  updated_at = NOW();

INSERT INTO template_process_types (template_id, process_type_id)
SELECT id, process_type_id FROM templates WHERE process_type_id IS NOT NULL
ON CONFLICT (template_id, process_type_id) DO NOTHING;

-- --- Entidades ---
INSERT INTO entities (id, name, nit, representative_name, organization_id, logo_url, status, created_at, updated_at) VALUES
  ('20000001-0001-4001-8001-000000000001', 'Alcaldía de Bogotá', '899.999.061-9', 'Carlos Fernando Galán', '11111111-1111-1111-1111-111111111111', NULL, 'active', NOW(), NOW()),
  ('20000001-0001-4001-8001-000000000002', 'Gobernación de Cundinamarca', '899.999.114-8', 'Jorge Emilio Rey', '11111111-1111-1111-1111-111111111111', NULL, 'active', NOW(), NOW()),
  ('20000001-0001-4001-8001-000000000003', 'Municipio de Chía', '899.999.230-7', 'Leonardo Donoso', '11111111-1111-1111-1111-111111111111', NULL, 'active', NOW(), NOW()),
  ('20000001-0001-4001-8001-000000000004', 'Hospital San Rafael', '860.013.570-3', 'Patricia Muñoz', '11111111-1111-1111-1111-111111111111', NULL, 'active', NOW(), NOW()),
  ('20000001-0001-4001-8001-000000000005', 'Universidad Distrital', '899.999.063-5', 'Giovanny Tarazona', '11111111-1111-1111-1111-111111111111', NULL, 'inactive', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  nit = EXCLUDED.nit,
  representative_name = EXCLUDED.representative_name,
  organization_id = EXCLUDED.organization_id,
  status = EXCLUDED.status,
  updated_at = NOW();

-- --- Secretarías ---
INSERT INTO secretaries (id, name, secretary_name, email, phone, entity_id, created_at, updated_at) VALUES
  ('30000001-0001-4001-8001-000000000001', 'Secretaría de Hacienda', 'Carlos Andrés Pérez', 'hacienda@alcaldia.gov.co', '+57 1 234 5678', '20000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('30000001-0001-4001-8001-000000000002', 'Secretaría de Movilidad', 'María Elena Rodríguez', 'movilidad@alcaldia.gov.co', '+57 1 234 5679', '20000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('30000001-0001-4001-8001-000000000003', 'Secretaría de Salud', 'Juan Pablo Martínez', 'salud@alcaldia.gov.co', '+57 1 234 5680', '20000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('30000001-0001-4001-8001-000000000004', 'Secretaría de Educación', 'Laura Patricia González', 'educacion@gobernacion.gov.co', '+57 2 345 6789', '20000001-0001-4001-8001-000000000002', NOW(), NOW()),
  ('30000001-0001-4001-8001-000000000005', 'Secretaría de Infraestructura', 'Roberto Carlos Sánchez', 'infraestructura@gobernacion.gov.co', '+57 2 345 6790', '20000001-0001-4001-8001-000000000002', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  secretary_name = EXCLUDED.secretary_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  entity_id = EXCLUDED.entity_id,
  updated_at = NOW();

-- --- Procesos ---
INSERT INTO processes (id, code, object, description, status, entity_id, secretary_id, process_type_id, created_at, updated_at, current_version, created_by) VALUES
  ('40000001-0001-4001-8001-000000000001', 'CD-2024-001', 'Adquisición de equipos de cómputo para la Secretaría de Hacienda', 'Compra de 50 computadores portátiles y 20 estaciones de trabajo', 'in_progress', '20000001-0001-4001-8001-000000000001', '30000001-0001-4001-8001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-11-01', '2024-11-20', 2, NULL),
  ('40000001-0001-4001-8001-000000000002', 'LP-2024-015', 'Construcción de vía terciaria en zona rural', 'Mejoramiento y pavimentación de 15 km de vía terciaria', 'review', '20000001-0001-4001-8001-000000000001', '30000001-0001-4001-8001-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2024-10-15', '2024-11-18', 3, NULL),
  ('40000001-0001-4001-8001-000000000003', 'SA-2024-008', 'Suministro de insumos médicos hospitalarios', 'Material médico quirúrgico y medicamentos Q1 2025', 'draft', '20000001-0001-4001-8001-000000000001', '30000001-0001-4001-8001-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2024-11-10', '2024-11-22', 1, NULL),
  ('40000001-0001-4001-8001-000000000004', 'CM-2024-003', 'Consultoría para Plan de Ordenamiento Territorial', 'Actualización del POT municipal', 'completed', '20000001-0001-4001-8001-000000000003', '30000001-0001-4001-8001-000000000005', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2024-08-20', '2024-10-30', 4, NULL),
  ('40000001-0001-4001-8001-000000000005', 'MC-2024-042', 'Compra de útiles de oficina', 'Papelería y elementos de oficina', 'completed', '20000001-0001-4001-8001-000000000002', '30000001-0001-4001-8001-000000000004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2024-11-05', '2024-11-15', 1, NULL)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  object = EXCLUDED.object,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  entity_id = EXCLUDED.entity_id,
  secretary_id = EXCLUDED.secretary_id,
  process_type_id = EXCLUDED.process_type_id,
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- --- Documentos ---
INSERT INTO documents (id, process_id, name, type, version, status, file_url, file_size, created_by, created_at, updated_at) VALUES
  ('50000001-0001-4001-8001-000000000001', '40000001-0001-4001-8001-000000000001', 'Estudios Previos', 'estudios_previos', 2, 'approved', '/documents/estudios-previos-cd-2024-001-v2.docx', 245000, NULL, '2024-11-18', '2024-11-20'),
  ('50000001-0001-4001-8001-000000000002', '40000001-0001-4001-8001-000000000001', 'Análisis del Sector', 'analisis_sector', 1, 'approved', '/documents/analisis-sector-cd-2024-001-v1.docx', 180000, NULL, '2024-11-15', '2024-11-15'),
  ('50000001-0001-4001-8001-000000000003', '40000001-0001-4001-8001-000000000001', 'Matriz de Riesgos', 'matriz_riesgos', 1, 'pending', '/documents/matriz-riesgos-cd-2024-001-v1.docx', 95000, NULL, '2024-11-19', '2024-11-19'),
  ('50000001-0001-4001-8001-000000000004', '40000001-0001-4001-8001-000000000002', 'Pliego de Condiciones', 'pliego_condiciones', 3, 'approved', '/documents/pliego-lp-2024-015-v3.docx', 520000, NULL, '2024-10-20', '2024-11-18'),
  ('50000001-0001-4001-8001-000000000005', '40000001-0001-4001-8001-000000000002', 'Estudios Previos', 'estudios_previos', 2, 'approved', '/documents/estudios-previos-lp-2024-015-v2.docx', 380000, NULL, '2024-10-18', '2024-11-10'),
  ('50000001-0001-4001-8001-000000000006', '40000001-0001-4001-8001-000000000002', 'Anexo Técnico', 'anexo_tecnico', 2, 'approved', '/documents/anexo-tecnico-lp-2024-015-v2.docx', 290000, NULL, '2024-10-22', '2024-11-12'),
  ('50000001-0001-4001-8001-000000000007', '40000001-0001-4001-8001-000000000002', 'Matriz de Riesgos', 'matriz_riesgos', 1, 'approved', '/documents/matriz-riesgos-lp-2024-015-v1.docx', 125000, NULL, '2024-10-25', '2024-10-25'),
  ('50000001-0001-4001-8001-000000000008', '40000001-0001-4001-8001-000000000002', 'Cronograma', 'cronograma', 1, 'pending', '/documents/cronograma-lp-2024-015-v1.docx', 78000, NULL, '2024-11-15', '2024-11-15'),
  ('50000001-0001-4001-8001-000000000009', '40000001-0001-4001-8001-000000000003', 'Estudios Previos', 'estudios_previos', 1, 'draft', '/documents/estudios-previos-sa-2024-008-v1.docx', 210000, NULL, '2024-11-22', '2024-11-22'),
  ('50000001-0001-4001-8001-00000000000a', '40000001-0001-4001-8001-000000000004', 'Términos de Referencia', 'terminos_referencia', 4, 'approved', '/documents/terminos-cm-2024-003-v4.docx', 450000, NULL, '2024-08-25', '2024-10-28'),
  ('50000001-0001-4001-8001-00000000000b', '40000001-0001-4001-8001-000000000004', 'Estudios Previos', 'estudios_previos', 3, 'approved', '/documents/estudios-previos-cm-2024-003-v3.docx', 320000, NULL, '2024-08-22', '2024-10-15'),
  ('50000001-0001-4001-8001-00000000000c', '40000001-0001-4001-8001-000000000005', 'Invitación Pública', 'invitacion', 1, 'approved', '/documents/invitacion-mc-2024-042-v1.docx', 85000, NULL, '2024-11-05', '2024-11-08'),
  ('50000001-0001-4001-8001-00000000000d', '40000001-0001-4001-8001-000000000005', 'Estudios Previos', 'estudios_previos', 1, 'approved', '/documents/estudios-previos-mc-2024-042-v1.docx', 145000, NULL, '2024-11-05', '2024-11-07')
ON CONFLICT (id) DO UPDATE SET
  process_id = EXCLUDED.process_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  version = EXCLUDED.version,
  status = EXCLUDED.status,
  file_url = EXCLUDED.file_url,
  file_size = EXCLUDED.file_size,
  updated_at = NOW();

-- =============================================================================
-- H — Superadmin: clgingeniero@gmail.com
-- =============================================================================
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
  name = COALESCE(EXCLUDED.name, profiles.name),
  updated_at = NOW();

-- Verificación
SELECT 'organizations' AS tabla, COUNT(*)::text AS filas FROM organizations
UNION ALL SELECT 'process_types', COUNT(*)::text FROM process_types
UNION ALL SELECT 'templates', COUNT(*)::text FROM templates
UNION ALL SELECT 'entities', COUNT(*)::text FROM entities
UNION ALL SELECT 'secretaries', COUNT(*)::text FROM secretaries
UNION ALL SELECT 'processes', COUNT(*)::text FROM processes
UNION ALL SELECT 'documents', COUNT(*)::text FROM documents
UNION ALL SELECT 'superadmin (clgingeniero)', COALESCE(role, 'NO EXISTE — regístrate primero') FROM profiles WHERE email = 'clgingeniero@gmail.com';
