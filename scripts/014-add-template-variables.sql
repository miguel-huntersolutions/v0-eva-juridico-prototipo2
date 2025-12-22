-- Add variables field to templates table
-- This field will store the extracted tags/variables from the template document as JSON

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the field
COMMENT ON COLUMN templates.variables IS 'Array of variable names extracted from the template document (e.g., ["NOMBRE_SECRETARIO", "ENTIDAD_NOMBRE"])';

