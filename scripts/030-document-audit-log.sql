-- Audit log for document status transitions (including rejection comments).
-- Each row = one status change: who, when, from_status → to_status, optional comment.

CREATE TABLE IF NOT EXISTS document_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL CHECK (to_status IN ('draft', 'pending', 'in_review', 'approved', 'rejected')),
  changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  changed_by_role TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_audit_log_document_id ON document_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_log_created_at ON document_audit_log(created_at DESC);

COMMENT ON TABLE document_audit_log IS 'Historial de cambios de estado de documentos; incluye comentarios de rechazo y aprobación';
