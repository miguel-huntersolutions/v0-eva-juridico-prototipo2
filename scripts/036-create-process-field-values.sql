-- =============================================================================
-- CAP-03 · RF-012/RF-013/RF-014 — Valores del formulario por proceso
-- =============================================================================
-- Hoy los campos diligenciados (formData/tableData) solo viven en memoria al
-- generar el documento. Esta tabla los persiste para poder:
--   · RF-012: reutilizar un proceso con sus campos precargados.
--   · RF-013: saber qué campos vienen del original y exigir confirmación.
--   · RF-014: copiar campos entre minutas del mismo proceso (mismo nombre).
--
-- Ejecutar AISLADO en Supabase SQL Editor (es seguro: solo crea objetos nuevos).
-- NO está incluido en 000-rebuild-all.sql (que borra todos los datos).
-- =============================================================================

CREATE TABLE IF NOT EXISTS process_field_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,                 -- nombre de la variable sin {{}} (p.ej. NOMBRE, OBJETO)
  value TEXT,                        -- valor escalar (NULL si es tabla dinámica)
  table_rows JSONB,                  -- filas si el tag es una tabla dinámica
  origin TEXT NOT NULL DEFAULT 'form' CHECK (origin IN ('form', 'reuse', 'copy', 'smart_fill')),
  confirmed BOOLEAN NOT NULL DEFAULT FALSE, -- RF-013: campos clave confirmados antes de generar
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (process_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_process_field_values_process ON process_field_values(process_id);

-- Marca de proceso reutilizado (RF-012/RF-013): origen y campos que exigen revisión.
ALTER TABLE processes
  ADD COLUMN IF NOT EXISTS reused_from_process_id UUID REFERENCES processes(id) ON DELETE SET NULL;

-- RLS: misma organización que el proceso (via entity -> organization).
ALTER TABLE process_field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS process_field_values_select ON process_field_values;
CREATE POLICY process_field_values_select ON process_field_values
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM processes p
      JOIN entities e ON e.id = p.entity_id
      JOIN profiles pr ON pr.organization_id = e.organization_id
      WHERE p.id = process_field_values.process_id
        AND pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS process_field_values_insert ON process_field_values;
CREATE POLICY process_field_values_insert ON process_field_values
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM processes p
      JOIN entities e ON e.id = p.entity_id
      JOIN profiles pr ON pr.organization_id = e.organization_id
      WHERE p.id = process_field_values.process_id
        AND pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS process_field_values_update ON process_field_values;
CREATE POLICY process_field_values_update ON process_field_values
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM processes p
      JOIN entities e ON e.id = p.entity_id
      JOIN profiles pr ON pr.organization_id = e.organization_id
      WHERE p.id = process_field_values.process_id
        AND pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS process_field_values_delete ON process_field_values;
CREATE POLICY process_field_values_delete ON process_field_values
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM processes p
      JOIN entities e ON e.id = p.entity_id
      JOIN profiles pr ON pr.organization_id = e.organization_id
      WHERE p.id = process_field_values.process_id
        AND pr.id = auth.uid()
    )
  );
