-- =============================================================================
-- CAP-07 · Canal de comunicación (RF-025/026/027/040)
-- Hilo de mensajes por proceso, inalterable, con rol "contacto de entidad".
--
-- Ejecutar AISLADO en Supabase SQL Editor (seguro: crea objetos nuevos y
-- amplía el CHECK de roles). NO está incluido en 000-rebuild-all.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Rol nuevo: "contacto de entidad" (funcionario de la alcaldía).
--    Solo lee/escribe hilos de procesos de SU entidad y ve su estado (CA-025.3).
-- -----------------------------------------------------------------------------
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('superadmin', 'admin', 'member', 'entity_contact'));

-- A qué entidad pertenece el contacto (solo aplica para entity_contact)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 2. Mensajes del hilo (RF-025). INALTERABLES: sin editar ni borrar (CA-025.4);
--    la corrección se hace con un mensaje nuevo.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS process_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (char_length(body) <= 5000),
  attachment_id UUID REFERENCES process_attachments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_process_messages_process
  ON process_messages(process_id, created_at);
CREATE INDEX IF NOT EXISTS idx_process_messages_org
  ON process_messages(organization_id, created_at DESC);

-- CA-025.4: mensajes inalterables (mismo patrón que audit_log)
CREATE OR REPLACE FUNCTION process_messages_reject_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'process_messages es inalterable: no se permite %', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS process_messages_no_update ON process_messages;
CREATE TRIGGER process_messages_no_update
  BEFORE UPDATE ON process_messages
  FOR EACH ROW EXECUTE FUNCTION process_messages_reject_mutation();

DROP TRIGGER IF EXISTS process_messages_no_delete ON process_messages;
CREATE TRIGGER process_messages_no_delete
  BEFORE DELETE ON process_messages
  FOR EACH ROW EXECUTE FUNCTION process_messages_reject_mutation();

-- RLS: la lectura/escritura fina por rol se valida en la API (service role);
-- a nivel de tabla solo miembros de la organización pueden leer, y escribir
-- queda reservado al service role para garantizar validaciones y auditoría.
ALTER TABLE process_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS process_messages_select ON process_messages;
CREATE POLICY process_messages_select ON process_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid()
        AND (
          pr.role = 'superadmin'
          OR pr.organization_id = process_messages.organization_id
        )
    )
  );

-- Sin políticas de INSERT/UPDATE/DELETE para usuarios: la API valida el acceso
-- (member con acceso a la entidad, admin de la org, contacto de ESA entidad),
-- audita cada mensaje (RF-040) y dispara las notificaciones (RF-026).

-- -----------------------------------------------------------------------------
-- 3. CA-025.3 a nivel de datos: el contacto de entidad solo VE los procesos y
--    documentos de SU entidad, aunque su perfil pertenezca a la organización.
--    (Las demás pantallas de EVA le devuelven vacío; la API de mensajes
--    además responde 403 fuera de su entidad.)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "processes_select" ON processes;
CREATE POLICY "processes_select" ON processes
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        (
          get_user_role(auth.uid()) = 'entity_contact'
          AND processes.entity_id = (SELECT entity_id FROM profiles WHERE id = auth.uid())
        ) OR
        (
          get_user_role(auth.uid()) IN ('admin', 'member') AND
          EXISTS (
              SELECT 1 FROM entities
              WHERE entities.id = processes.entity_id
              AND entities.organization_id = get_user_org(auth.uid())
          )
        )
    );

DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        (
          get_user_role(auth.uid()) = 'entity_contact'
          AND EXISTS (
              SELECT 1 FROM processes p
              WHERE p.id = documents.process_id
              AND p.entity_id = (SELECT entity_id FROM profiles WHERE id = auth.uid())
          )
        ) OR
        (
          get_user_role(auth.uid()) IN ('admin', 'member') AND
          EXISTS (
              SELECT 1 FROM processes p
              JOIN entities e ON e.id = p.entity_id
              WHERE p.id = documents.process_id
              AND e.organization_id = get_user_org(auth.uid())
          )
        )
    );
