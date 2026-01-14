-- Create member_entities junction table to track which entities are assigned to which members
CREATE TABLE IF NOT EXISTS member_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, entity_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_member_entities_member_id ON member_entities(member_id);
CREATE INDEX IF NOT EXISTS idx_member_entities_entity_id ON member_entities(entity_id);

-- Enable RLS
ALTER TABLE member_entities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own entity assignments
CREATE POLICY "member_entities_select_own"
ON member_entities
FOR SELECT
USING (member_id = auth.uid());

-- Policy: Admins can view entity assignments for members in their organization
CREATE POLICY "member_entities_select_admin"
ON member_entities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    WHERE p1.id = auth.uid()
    AND p1.role = 'admin'
    AND EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = member_entities.member_id
      AND p2.organization_id = p1.organization_id
    )
  )
);

-- Policy: Superadmins can view all entity assignments
CREATE POLICY "member_entities_select_superadmin"
ON member_entities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'superadmin'
  )
);

-- Policy: Admins can insert/update/delete entity assignments for members in their organization
CREATE POLICY "member_entities_admin_manage"
ON member_entities
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    WHERE p1.id = auth.uid()
    AND p1.role IN ('admin', 'superadmin')
    AND (
      p1.role = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM profiles p2
        WHERE p2.id = member_entities.member_id
        AND p2.organization_id = p1.organization_id
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p1
    WHERE p1.id = auth.uid()
    AND p1.role IN ('admin', 'superadmin')
    AND (
      p1.role = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM profiles p2
        WHERE p2.id = member_entities.member_id
        AND p2.organization_id = p1.organization_id
      )
    )
  )
);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_member_entities_updated_at
BEFORE UPDATE ON member_entities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

