-- Datos mínimos para poder usar la app (orgs + tipos de proceso)

INSERT INTO organizations (id, name, nit, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Organización Demo', '900.000.000-1', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, nit = EXCLUDED.nit, status = EXCLUDED.status;

INSERT INTO process_types (id, name, description) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Contratación Directa', 'Contratación directa Ley 1150'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Licitación Pública', 'Licitación pública'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Selección Abreviada', 'Selección abreviada'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Concurso de Méritos', 'Concurso de méritos'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Mínima Cuantía', 'Mínima cuantía')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
