-- Asociar plantillas maestras a una entidad cliente (opcional: NULL = visible para cualquier entidad, legado).
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_templates_entity_id ON templates(entity_id);

COMMENT ON COLUMN templates.entity_id IS 'Si está definido, la plantilla solo aplica a procesos de esa entidad (junto al tipo de proceso). NULL = todas las entidades (compatibilidad).';
