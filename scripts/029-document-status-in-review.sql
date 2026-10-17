-- Add 'in_review' status to documents for admin "En revisión" workflow.
-- Member sends to review (pending); admin moves to in_review (locked for member); admin then approves or rejects.

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_status_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_status_check
  CHECK (status IN ('draft', 'pending', 'in_review', 'approved', 'rejected'));

COMMENT ON COLUMN documents.status IS 'draft=borrador, pending=pendiente (enviado por member), in_review=en revisión (admin), approved/rejected';
