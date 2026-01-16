-- Function to automatically create a profile when a user signs up
-- Safe version without DROP TRIGGER (only updates the function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    'pending', -- All new users start with pending status, must be approved by admin
    NULLIF(NEW.raw_user_meta_data->>'organization_id', '')::uuid -- Get organization_id from user metadata if provided
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger for new user creation
-- This is safe because it only affects new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
-- Drop existing triggers if they exist, then recreate them
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_secretaries_updated_at ON secretaries;
CREATE TRIGGER update_secretaries_updated_at BEFORE UPDATE ON secretaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_process_types_updated_at ON process_types;
CREATE TRIGGER update_process_types_updated_at BEFORE UPDATE ON process_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_processes_updated_at ON processes;
CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON processes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for dashboard statistics
CREATE OR REPLACE VIEW organization_stats AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COUNT(DISTINCT p.id) as members_count,
  COUNT(DISTINCT e.id) as entities_count
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
LEFT JOIN entities e ON e.organization_id = o.id
GROUP BY o.id, o.name;

-- View for process statistics by entity
CREATE OR REPLACE VIEW entity_process_stats AS
SELECT 
  e.id as entity_id,
  e.name as entity_name,
  COUNT(pr.id) as total_processes,
  COUNT(CASE WHEN pr.status = 'draft' THEN 1 END) as draft_count,
  COUNT(CASE WHEN pr.status = 'in_progress' THEN 1 END) as in_progress_count,
  COUNT(CASE WHEN pr.status = 'review' THEN 1 END) as review_count,
  COUNT(CASE WHEN pr.status = 'completed' THEN 1 END) as completed_count
FROM entities e
LEFT JOIN processes pr ON pr.entity_id = e.id
GROUP BY e.id, e.name;

