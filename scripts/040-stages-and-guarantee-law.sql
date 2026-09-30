-- =============================================================================
-- CAP-11 · Alertas de vencimiento y ley de garantías (RF-044/045/046)
--
-- Ejecutar AISLADO en Supabase SQL Editor (seguro: solo crea objetos nuevos).
-- NO está incluido en 000-rebuild-all.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RF-044: etapas estándar del cronograma SECOP por proceso.
--    Seis etapas en orden: publicación, observaciones, adjudicación, firma,
--    garantías, inicio. Cada una tiene fecha y marca de cumplida.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS process_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL CHECK (stage_key IN (
    'publicacion', 'observaciones', 'adjudicacion', 'firma', 'garantias', 'inicio'
  )),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,          -- NULL = pendiente
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (process_id, stage_key)
);

CREATE INDEX IF NOT EXISTS idx_process_stages_due
  ON process_stages(due_date) WHERE completed_at IS NULL;

ALTER TABLE process_stages ENABLE ROW LEVEL SECURITY;

-- Lectura/escritura: mismos alcances que el proceso (por organización).
DROP POLICY IF EXISTS process_stages_select ON process_stages;
CREATE POLICY process_stages_select ON process_stages
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'superadmin' OR
    EXISTS (
      SELECT 1 FROM processes p
      JOIN entities e ON e.id = p.entity_id
      WHERE p.id = process_stages.process_id
        AND e.organization_id = get_user_org(auth.uid())
    )
  );

DROP POLICY IF EXISTS process_stages_insert ON process_stages;
CREATE POLICY process_stages_insert ON process_stages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM processes p
      JOIN entities e ON e.id = p.entity_id
      WHERE p.id = process_id
        AND e.organization_id = get_user_org(auth.uid())
    )
  );

DROP POLICY IF EXISTS process_stages_update ON process_stages;
CREATE POLICY process_stages_update ON process_stages
  FOR UPDATE USING (
    get_user_role(auth.uid()) = 'superadmin' OR
    EXISTS (
      SELECT 1 FROM processes p
      JOIN entities e ON e.id = p.entity_id
      WHERE p.id = process_stages.process_id
        AND e.organization_id = get_user_org(auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 2. RF-046: periodos de restricción de ley de garantías, administrables por
--    el superadministrador. Las fechas viven en BD (RNF-14: nada quemado).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guarantee_law_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                -- ej. "Elecciones regionales 2027"
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  scope TEXT,                        -- alcance: qué restrige (texto libre)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_on >= starts_on)
);

ALTER TABLE guarantee_law_periods ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados leen los periodos (EVA los advierte);
-- solo el superadministrador los administra (vía API con service role).
DROP POLICY IF EXISTS guarantee_law_periods_select ON guarantee_law_periods;
CREATE POLICY guarantee_law_periods_select ON guarantee_law_periods
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- 3. RF-045: registro de alertas ya enviadas (idempotencia del cron diario:
--    una alerta de 3 días y una de 1 día por etapa, nunca repetidas).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stage_alerts_sent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_stage_id UUID NOT NULL REFERENCES process_stages(id) ON DELETE CASCADE,
  alert_kind TEXT NOT NULL CHECK (alert_kind IN ('3d', '1d')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (process_stage_id, alert_kind)
);

ALTER TABLE stage_alerts_sent ENABLE ROW LEVEL SECURITY;

-- Solo lectura para admin/superadmin (trazabilidad de alertas)
DROP POLICY IF EXISTS stage_alerts_sent_select ON stage_alerts_sent;
CREATE POLICY stage_alerts_sent_select ON stage_alerts_sent
  FOR SELECT USING (get_user_role(auth.uid()) IN ('superadmin', 'admin'));
