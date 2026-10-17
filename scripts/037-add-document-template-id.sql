-- =============================================================================
-- CAP-02/CAP-04 — Relación documento ↔ plantilla
-- =============================================================================
-- Permite saber qué plantilla generó cada documento. Necesario para:
--   · Mostrar en el wizard qué documentos del proceso ya fueron generados
--     y continuar un proceso parcialmente generado (1 o 3 de 9, por ejemplo).
--   · Versionar por (proceso, plantilla) en el futuro.
--
-- Ejecutar AISLADO en Supabase SQL Editor (seguro: solo agrega columna e índice).
-- =============================================================================

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_template_id ON documents(template_id);

COMMENT ON COLUMN documents.template_id IS 'Plantilla que generó el documento (NULL para adjuntos o docs antiguos).';
