-- =============================================================================
-- RF-037 / B18 (CAP-02): adjuntos de proceso (archivos que no son texto).
-- Se guardan en la carpeta del proceso en Drive y se listan en EVA.
-- No se procesan con IA en el MVP.
-- =============================================================================

CREATE TABLE IF NOT EXISTS process_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT,
  drive_file_id TEXT,
  mime_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_process_attachments_process ON process_attachments(process_id);

ALTER TABLE process_attachments ENABLE ROW LEVEL SECURITY;

-- Lectura/escritura para usuarios autenticados; el aislamiento por organización
-- lo aplican las rutas de API (service-role con validación de org).
CREATE POLICY "process_attachments_select" ON process_attachments
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "process_attachments_insert" ON process_attachments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "process_attachments_delete" ON process_attachments
  FOR DELETE USING (auth.uid() IS NOT NULL);
