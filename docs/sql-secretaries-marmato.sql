-- Secretarías – Marmato (entity_id del ejemplo: 862221c8-1066-4fb9-8cbb-b25046390690)
-- Ajustar secretary_name, email y phone según designación de la entidad.

INSERT INTO "public"."secretaries" ("id", "name", "secretary_name", "email", "phone", "entity_id", "created_at", "updated_at") VALUES
  (gen_random_uuid(), 'Secretaría de planeación, vivienda e Infraestructura', 'Por designar', 'planeacion@marmato-caldas.gov.co', '', '862221c8-1066-4fb9-8cbb-b25046390690', NOW(), NOW()),
  (gen_random_uuid(), 'Secretaría de hacienda y asuntos administrativos', 'Por designar', 'hacienda@marmato-caldas.gov.co', '', '862221c8-1066-4fb9-8cbb-b25046390690', NOW(), NOW()),
  (gen_random_uuid(), 'Secretaría de desarrollo económico, ambiental y de servicios públicos', 'Por designar', 'desarrollo.economico@marmato-caldas.gov.co', '', '862221c8-1066-4fb9-8cbb-b25046390690', NOW(), NOW()),
  (gen_random_uuid(), 'Secretaría de desarrollo social', 'Por designar', 'desarrollo.social@marmato-caldas.gov.co', '', '862221c8-1066-4fb9-8cbb-b25046390690', NOW(), NOW());
