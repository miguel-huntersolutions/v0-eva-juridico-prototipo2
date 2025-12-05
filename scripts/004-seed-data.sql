-- Seed initial data for EVA Jurídico

-- Insert process types
INSERT INTO process_types (id, name, description) VALUES
  ('pt-1', 'Contratación Directa', 'Proceso de contratación directa según el artículo 2 de la Ley 1150 de 2007'),
  ('pt-2', 'Licitación Pública', 'Proceso de licitación pública para contratos de mayor cuantía'),
  ('pt-3', 'Selección Abreviada', 'Proceso de selección abreviada de menor cuantía'),
  ('pt-4', 'Concurso de Méritos', 'Proceso para contratación de consultoría'),
  ('pt-5', 'Mínima Cuantía', 'Proceso simplificado para adquisiciones de menor valor');

-- Insert templates
INSERT INTO templates (name, process_type_id, file_url) VALUES
  ('Estudios Previos - Contratación Directa', 'pt-1', '/templates/estudios-previos-cd.docx'),
  ('Análisis del Sector - Contratación Directa', 'pt-1', '/templates/analisis-sector-cd.docx'),
  ('Minuta del Contrato - Contratación Directa', 'pt-1', '/templates/minuta-contrato-cd.docx'),
  ('Pliego de Condiciones - Licitación', 'pt-2', '/templates/pliego-condiciones-lp.docx'),
  ('Estudios Previos - Licitación Pública', 'pt-2', '/templates/estudios-previos-lp.docx'),
  ('Anexo Técnico - Licitación Pública', 'pt-2', '/templates/anexo-tecnico-lp.docx'),
  ('Acta de Apertura - Licitación Pública', 'pt-2', '/templates/acta-apertura-lp.docx'),
  ('Estudios Previos - Selección Abreviada', 'pt-3', '/templates/estudios-previos-sa.docx'),
  ('Invitación Pública - Selección Abreviada', 'pt-3', '/templates/invitacion-publica-sa.docx'),
  ('Términos de Referencia - Concurso', 'pt-4', '/templates/terminos-referencia-cm.docx'),
  ('Matriz de Evaluación - Concurso', 'pt-4', '/templates/matriz-evaluacion-cm.docx'),
  ('Invitación - Mínima Cuantía', 'pt-5', '/templates/invitacion-mc.docx'),
  ('Aceptación de Oferta - Mínima Cuantía', 'pt-5', '/templates/aceptacion-oferta-mc.docx');

-- Insert a demo organization
INSERT INTO organizations (id, name, nit, status) VALUES
  ('org-demo', 'Organización Demo', '900.000.000-0', 'active');
