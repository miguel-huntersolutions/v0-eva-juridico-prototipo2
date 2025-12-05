-- Enable Row Level Security on all tables

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Superadmins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Admins can view profiles in their organization" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin' 
      AND p.organization_id = profiles.organization_id
    )
  );

-- Organizations policies
CREATE POLICY "Superadmins can manage all organizations" ON organizations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = organizations.id)
  );

-- Entities policies
CREATE POLICY "Superadmins can manage all entities" ON entities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Admins can manage entities in their organization" ON entities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND organization_id = entities.organization_id
    )
  );

CREATE POLICY "Members can view entities in their organization" ON entities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND organization_id = entities.organization_id
    )
  );

-- Secretaries policies
CREATE POLICY "Users can view secretaries of their entities" ON secretaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN entities e ON e.organization_id = p.organization_id
      WHERE p.id = auth.uid() AND e.id = secretaries.entity_id
    )
  );

CREATE POLICY "Admins can manage secretaries" ON secretaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN entities e ON e.organization_id = p.organization_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'superadmin')
      AND e.id = secretaries.entity_id
    )
  );

-- Process types policies (globally readable, only superadmins can modify)
CREATE POLICY "Everyone can view process types" ON process_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmins can manage process types" ON process_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- Templates policies (globally readable, only superadmins can modify)
CREATE POLICY "Everyone can view templates" ON templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmins can manage templates" ON templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- Processes policies
CREATE POLICY "Users can view processes of their organization" ON processes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN entities e ON e.organization_id = p.organization_id
      WHERE p.id = auth.uid() AND e.id = processes.entity_id
    )
  );

CREATE POLICY "Members and admins can manage processes" ON processes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN entities e ON e.organization_id = p.organization_id
      WHERE p.id = auth.uid() AND e.id = processes.entity_id
    )
  );

-- Documents policies
CREATE POLICY "Users can view documents of their processes" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN entities e ON e.organization_id = p.organization_id
      JOIN processes pr ON pr.entity_id = e.id
      WHERE p.id = auth.uid() AND pr.id = documents.process_id
    )
  );

CREATE POLICY "Members and admins can manage documents" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN entities e ON e.organization_id = p.organization_id
      JOIN processes pr ON pr.entity_id = e.id
      WHERE p.id = auth.uid() AND pr.id = documents.process_id
    )
  );

-- Chat messages policies
CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
