-- Document assistant sessions (SPEC-002): state for conversational document generation
-- session_id is the client-generated UUID used as primary key

CREATE TABLE IF NOT EXISTS document_assistant_sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  context JSONB NOT NULL,
  document_state JSONB NOT NULL DEFAULT '{}',
  current_document_index INTEGER NOT NULL DEFAULT 0,
  template_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_assistant_sessions_user_id
  ON document_assistant_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_assistant_sessions_updated_at
  ON document_assistant_sessions(updated_at);

COMMENT ON TABLE document_assistant_sessions IS 'Session state for RFC-002 conversational document generation (document-assistant)';
COMMENT ON COLUMN document_assistant_sessions.context IS 'processId, processCode, entityId, entityName, secretaryName, processTypeId, templateIds';
COMMENT ON COLUMN document_assistant_sessions.document_state IS 'Tag -> value map for current template';
COMMENT ON COLUMN document_assistant_sessions.template_ids IS 'Array of template UUIDs in order';

-- RLS: users can only access their own sessions
ALTER TABLE document_assistant_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_assistant_sessions_select_own" ON document_assistant_sessions;
CREATE POLICY "document_assistant_sessions_select_own"
  ON document_assistant_sessions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "document_assistant_sessions_insert_own" ON document_assistant_sessions;
CREATE POLICY "document_assistant_sessions_insert_own"
  ON document_assistant_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "document_assistant_sessions_update_own" ON document_assistant_sessions;
CREATE POLICY "document_assistant_sessions_update_own"
  ON document_assistant_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "document_assistant_sessions_delete_own" ON document_assistant_sessions;
CREATE POLICY "document_assistant_sessions_delete_own"
  ON document_assistant_sessions FOR DELETE
  USING (user_id = auth.uid());

-- Trigger to refresh updated_at (reuse existing function if present)
DO $outer$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $outer$;

DROP TRIGGER IF EXISTS update_document_assistant_sessions_updated_at ON document_assistant_sessions;
CREATE TRIGGER update_document_assistant_sessions_updated_at
  BEFORE UPDATE ON document_assistant_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
