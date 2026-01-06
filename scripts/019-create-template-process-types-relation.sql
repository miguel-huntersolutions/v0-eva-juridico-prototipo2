-- Create a many-to-many relationship table between templates and process_types
-- This allows a template to be associated with multiple process types

-- Create the junction table
CREATE TABLE IF NOT EXISTS template_process_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  process_type_id UUID NOT NULL REFERENCES process_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, process_type_id) -- Prevent duplicate associations
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_template_process_types_template_id ON template_process_types(template_id);
CREATE INDEX IF NOT EXISTS idx_template_process_types_process_type_id ON template_process_types(process_type_id);

-- Migrate existing data: copy process_type_id from templates to the new junction table
INSERT INTO template_process_types (template_id, process_type_id)
SELECT id, process_type_id
FROM templates
WHERE process_type_id IS NOT NULL
ON CONFLICT (template_id, process_type_id) DO NOTHING;

-- Note: We keep process_type_id in templates table for backward compatibility
-- But the new association logic should use template_process_types table

