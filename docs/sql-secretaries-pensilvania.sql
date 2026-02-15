-- Secretarías – Pensilvania (entity_id: 61a7a93a-5105-40eb-993b-d54e9373123d)
-- SECRETARÍA GENERAL ya existe. Se agregan las siguientes.
-- Ajustar secretary_name, email y phone según designación de la entidad.

INSERT INTO "public"."secretaries" ("id", "name", "secretary_name", "email", "phone", "entity_id", "created_at", "updated_at") VALUES
  (gen_random_uuid(), 'GOBIERNO, CONTRATACIÓN Y TICS', 'Por designar', 'gobierno@pensilvania-caldas.gov.co', '', '61a7a93a-5105-40eb-993b-d54e9373123d', NOW(), NOW()),
  (gen_random_uuid(), 'SECRETARÍA DE PLANEACIÓN, INFRAESTRUCTURA, DESARROLLO SOCIAL Y MEDIO AMBIENTE', 'Por designar', 'planeacion@pensilvania-caldas.gov.co', '', '61a7a93a-5105-40eb-993b-d54e9373123d', NOW(), NOW()),
  (gen_random_uuid(), 'SECRETARÍA DE HACIENDA', 'Por designar', 'hacienda@pensilvania-caldas.gov.co', '', '61a7a93a-5105-40eb-993b-d54e9373123d', NOW(), NOW()),
  (gen_random_uuid(), 'SECRETARÍA DE SALUD', 'Por designar', 'salud@pensilvania-caldas.gov.co', '', '61a7a93a-5105-40eb-993b-d54e9373123d', NOW(), NOW());
