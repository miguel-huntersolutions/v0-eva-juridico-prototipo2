-- =============================================================================
-- CAP-10 · Entidades aprobadas y fusión (RF-035/RF-043)
--
-- Ejecutar AISLADO en Supabase SQL Editor (seguro: amplía CHECK y agrega
-- columnas). NO está incluido en 000-rebuild-all.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RF-035: las entidades pueden estar "pendientes de aprobación".
--    Un asesor las propone; solo el administrador las aprueba y mientras tanto
--    NO aparecen en el selector de procesos (CA-035.1/035.2).
-- -----------------------------------------------------------------------------
ALTER TABLE entities DROP CONSTRAINT IF EXISTS entities_status_check;
ALTER TABLE entities
  ADD CONSTRAINT entities_status_check
  CHECK (status IN ('active', 'inactive', 'pending', 'rejected'));

ALTER TABLE entities
  ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  -- RF-043: fusión — la entidad origen queda apuntando a la destino
  ADD COLUMN IF NOT EXISTS merged_into UUID REFERENCES entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);

-- -----------------------------------------------------------------------------
-- 2. RF-033: variables detectadas en las plantillas al cargarlas.
--    Se guardan para listar las "variables reutilizables conocidas" de la
--    organización (CA-033.3) y para validar campos al generar (RF-034).
-- -----------------------------------------------------------------------------
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS detected_variables JSONB,   -- ["OBJETO", "LOGO_ENTIDAD", ...]
  ADD COLUMN IF NOT EXISTS variables_validated_at TIMESTAMPTZ;
