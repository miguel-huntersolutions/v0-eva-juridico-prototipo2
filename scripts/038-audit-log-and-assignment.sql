-- =============================================================================
-- CAP-09 (RF-031/032/041) + CAP-08 (RF-028/029/030)
-- Registro de auditoría INALTERABLE y asignación de abogado responsable.
--
-- Ejecutar AISLADO en Supabase SQL Editor (seguro: solo crea objetos nuevos
-- y agrega columnas). NO está incluido en 000-rebuild-all.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CAP-09 · Tabla de auditoría (RF-031)
--    Guarda quién hizo qué, cuándo, desde qué IP y sobre qué proceso/documento.
--    NUNCA guarda el contenido completo de documentos ni de consultas (solo
--    metadatos en `details`).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  process_id UUID REFERENCES processes(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- quién lo hizo
  action TEXT NOT NULL,        -- process_created, document_generated, ...
  details JSONB,               -- metadatos (nunca contenido completo)
  ip TEXT,                     -- dirección IP del request
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_process ON audit_log(process_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);

-- CA-031.2: el registro es INALTERABLE. El service role bypasea RLS, así que la
-- inmutabilidad se garantiza con un trigger a nivel de base de datos: cualquier
-- UPDATE o DELETE (desde la app, desde cualquier sesión) es rechazado.
CREATE OR REPLACE FUNCTION audit_log_reject_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es inalterable: no se permite %', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_reject_mutation();

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_reject_mutation();

-- RLS: lectura solo para admin/superadmin de la organización (CA-031.3: un
-- member recibe vacío/403). Los INSERT se hacen desde el servidor con service
-- role (las APIs), así que no se necesita política de INSERT para usuarios.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_select ON audit_log;
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid()
        AND (pr.role = 'superadmin' OR (pr.role = 'admin' AND pr.organization_id = audit_log.organization_id))
    )
  );

-- Sin políticas de INSERT/UPDATE/DELETE para usuarios: escritura solo vía
-- service role; modificación/borrado bloqueados además por los triggers.

-- -----------------------------------------------------------------------------
-- 2. CAP-08 · Asignación de abogado responsable (RF-028)
--    Un único responsable por proceso, con fecha y quién asignó.
-- -----------------------------------------------------------------------------
ALTER TABLE processes
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_processes_assigned_to ON processes(assigned_to);

-- -----------------------------------------------------------------------------
-- 3. CAP-08 · Notificaciones en la aplicación (RF-029)
--    Campana del usuario: asignaciones, reasignaciones y (luego) hilos CAP-07.
--    El correo queda pendiente de infra transaccional (SMTP/Resend).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,            -- process_assigned, process_reassigned, ...
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,           -- NULL = no leída
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo lee (y marca leídas) sus propias notificaciones.
DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update ON notifications;
CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT solo vía service role (las APIs del servidor).
