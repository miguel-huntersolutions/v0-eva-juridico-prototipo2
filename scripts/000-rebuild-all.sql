-- =============================================================================
-- EVA Jurídico — RESET + REBUILD (ejecutar TODO en Supabase SQL Editor)
-- =============================================================================
-- 1. Pega y ejecuta este archivo completo (Run).
-- 2. Regístrate en la app (o crea usuario en Authentication).
-- 3. Ejecuta el bloque FINAL al final de este archivo con tu email.
-- =============================================================================

-- PASO 0 — Borrar esquema public y empezar limpio (Supabase SQL Editor)
-- Ejecutar SOLO este archivo primero, luego 000-rebuild-all.sql

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Limpiar políticas de storage del bucket entity-logos (si existían)
DROP POLICY IF EXISTS "Allow authenticated users to upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to logos" ON storage.objects;


-- --- A1 tablas (001-create-tables.sql) ---

-- EVA Jurídico Database Schema
-- This script creates all the necessary tables for the platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'member')) DEFAULT 'member',
  avatar_url TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nit TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to profiles after organizations table is created
ALTER TABLE profiles 
ADD CONSTRAINT fk_profiles_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Entities table
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nit TEXT NOT NULL,
  representative_name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secretaries table
CREATE TABLE secretaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- Secretary department name
  secretary_name TEXT NOT NULL, -- Person name
  email TEXT NOT NULL,
  phone TEXT,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Process types table
CREATE TABLE process_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  process_type_id UUID NOT NULL REFERENCES process_types(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processes table
CREATE TABLE processes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  object TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'in_progress', 'review', 'completed', 'archived')) DEFAULT 'draft',
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  secretary_id UUID REFERENCES secretaries(id) ON DELETE SET NULL,
  process_type_id UUID REFERENCES process_types(id) ON DELETE SET NULL,
  current_version INTEGER DEFAULT 1,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'in_review', 'approved', 'rejected')) DEFAULT 'draft',
  file_url TEXT,
  file_size INTEGER,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document audit log (status transitions + comments, e.g. rejection reason)
CREATE TABLE document_audit_log (
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
CREATE INDEX idx_document_audit_log_document_id ON document_audit_log(document_id);
CREATE INDEX idx_document_audit_log_created_at ON document_audit_log(created_at DESC);

-- Chat messages table for AI assistant
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_entities_organization ON entities(organization_id);
CREATE INDEX idx_secretaries_entity ON secretaries(entity_id);
CREATE INDEX idx_templates_process_type ON templates(process_type_id);
CREATE INDEX idx_processes_entity ON processes(entity_id);
CREATE INDEX idx_processes_status ON processes(status);
CREATE INDEX idx_documents_process ON documents(process_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);


-- --- A2 status (023-add-profile-status.sql) ---

-- Add status field to profiles table for user approval workflow
-- Status values: 'pending', 'approved', 'rejected'

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';
  END IF;
END $$;

-- Create index for better performance when querying by status
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Update existing users to 'approved' status (assuming they were already approved)
-- Only update users that were created BEFORE this migration (to avoid affecting new signups)
-- This assumes existing users should be approved, but new users should be pending
UPDATE profiles 
SET status = 'approved' 
WHERE (status IS NULL OR status = 'pending') 
  AND created_at < NOW() - INTERVAL '1 minute';



-- --- B1 conversations (011-create-conversations.sql) ---

-- Supabase Schema for AI Chat Conversations
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  preview TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sequence_order INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_conversation_sequence UNIQUE (conversation_id, sequence_order)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sequence_order ON messages(conversation_id, sequence_order);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own conversations
CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own conversations
CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can view messages from their conversations
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Policy: Users can insert messages to their conversations
CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Policy: Users can update messages from their conversations
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Policy: Users can delete messages from their conversations
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );



-- --- 014-add-template-variables.sql (014-add-template-variables.sql) ---

-- Add variables field to templates table
-- This field will store the extracted tags/variables from the template document as JSON

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the field
COMMENT ON COLUMN templates.variables IS 'Array of variable names extracted from the template document (e.g., ["NOMBRE_SECRETARIO", "ENTIDAD_NOMBRE"])';



-- --- 015-add-spreadsheet-link.sql (015-add-spreadsheet-link.sql) ---

-- Add spreadsheet_id and spreadsheet_url fields to processes table
-- This will store the Google Sheets link for each process

ALTER TABLE processes
ADD COLUMN IF NOT EXISTS spreadsheet_id TEXT,
ADD COLUMN IF NOT EXISTS spreadsheet_url TEXT;

-- Add comment
COMMENT ON COLUMN processes.spreadsheet_id IS 'Google Sheets spreadsheet ID for this process';
COMMENT ON COLUMN processes.spreadsheet_url IS 'Google Sheets spreadsheet URL for this process';



-- --- 017-add-drive-folder-link.sql (017-add-drive-folder-link.sql) ---

-- Add drive_folder_id and drive_folder_url to processes table
ALTER TABLE processes
ADD COLUMN drive_folder_id TEXT,
ADD COLUMN drive_folder_url TEXT;



-- --- 019-create-template-process-types-relation.sql (019-create-template-process-types-relation.sql) ---

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



-- --- 022-create-member-entities-table.sql (022-create-member-entities-table.sql) ---

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



-- --- 028-document-assistant-sessions.sql (028-document-assistant-sessions.sql) ---

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


-- --- 029-document-status-in-review.sql (029-document-status-in-review.sql) ---

-- Add 'in_review' status to documents for admin "En revisión" workflow.
-- Member sends to review (pending); admin moves to in_review (locked for member); admin then approves or rejects.

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_status_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_status_check
  CHECK (status IN ('draft', 'pending', 'in_review', 'approved', 'rejected'));

COMMENT ON COLUMN documents.status IS 'draft=borrador, pending=pendiente (enviado por member), in_review=en revisión (admin), approved/rejected';


-- --- 031-templates-entity-id.sql (031-templates-entity-id.sql) ---

-- Asociar plantillas maestras a una entidad cliente (opcional: NULL = visible para cualquier entidad, legado).
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_templates_entity_id ON templates(entity_id);

COMMENT ON COLUMN templates.entity_id IS 'Si está definido, la plantilla solo aplica a procesos de esa entidad (junto al tipo de proceso). NULL = todas las entidades (compatibilidad).';


-- --- C funciones (003-create-functions.sql) ---

-- Function to automatically create a profile when a user signs up
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

-- Trigger to create profile on signup
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


-- --- C2 thread (013-add-openai-thread-id.sql) ---

-- Add OpenAI thread_id field to conversations table
-- This field stores the OpenAI Assistant API thread ID for maintaining conversation context

-- Add the column
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS openai_thread_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_openai_thread_id ON conversations(openai_thread_id);

-- Add comment to document the field
COMMENT ON COLUMN conversations.openai_thread_id IS 'OpenAI Assistant API thread ID for maintaining conversation context with workflow assistants';



-- --- C3 google (016-create-google-oauth-tokens.sql) ---

-- Google OAuth2 Tokens table
-- This table stores OAuth2 tokens for Google Drive and Sheets integration

CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expiry_date TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_token UNIQUE (user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_user_id ON google_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_expiry ON google_oauth_tokens(expiry_date);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_google_oauth_tokens_updated_at
  BEFORE UPDATE ON google_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tokens
CREATE POLICY "Users can view own google tokens"
  ON google_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert own google tokens"
  ON google_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update own google tokens"
  ON google_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete own google tokens"
  ON google_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);



-- --- C4 trigger (026-fix-organization-id-trigger.sql) ---

-- Fix the handle_new_user trigger to better handle organization_id
-- This ensures organization_id is properly saved even if the trigger runs before metadata is fully available

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Try to extract organization_id from raw_user_meta_data
  -- Handle both string and direct UUID formats
  BEGIN
    -- First try to get it as a direct UUID value
    IF NEW.raw_user_meta_data ? 'organization_id' THEN
      -- Try to cast directly if it's already a UUID
      BEGIN
        org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        -- If casting fails, try to extract from string
        org_id := NULLIF(TRIM(NEW.raw_user_meta_data->>'organization_id'), '')::uuid;
      END;
    ELSE
      org_id := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If anything fails, set to NULL
    org_id := NULL;
  END;

  -- Create the profile with organization_id
  INSERT INTO public.profiles (id, name, email, role, status, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    'pending', -- All new users start with pending status, must be approved by admin
    org_id -- Use the extracted organization_id
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- --- D storage (018-create-storage-bucket.sql) ---

-- Create storage bucket for entity logos
-- This script creates a public bucket in Supabase Storage for storing entity logos

-- Create the bucket (run this in Supabase SQL Editor)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entity-logos',
  'entity-logos',
  true, -- Public bucket so logos can be accessed via URL
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated users to upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to logos" ON storage.objects;

-- Create storage policy to allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'entity-logos');

-- Create storage policy to allow authenticated users to update their own uploads
CREATE POLICY "Allow authenticated users to update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'entity-logos');

-- Create storage policy to allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'entity-logos');

-- Create storage policy to allow public read access
CREATE POLICY "Allow public read access to logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'entity-logos');



-- --- E0 enable RLS ---
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;


-- --- E1 profiles RLS (010-profiles-rls-only.sql) ---

-- RLS solo para profiles + funciones helper (sin políticas de otras tablas; ver 012)

DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_org(uuid) CASCADE;

DROP POLICY IF EXISTS "profiles_view_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_superadmin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_superadmin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_superadmin" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role, 'member') FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_org(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org(uuid) TO authenticated;


-- --- E2 tablas RLS (012-recreate-other-rls-policies.sql) ---

-- Recreate RLS policies for other tables (non-profiles)
-- These policies will work now that profiles table doesn't have RLS

-- Enable RLS on all tables except profiles
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "orgs_select" ON public.organizations;
DROP POLICY IF EXISTS "orgs_manage" ON public.organizations;
DROP POLICY IF EXISTS "entities_manage" ON public.entities;
DROP POLICY IF EXISTS "secretaries_manage" ON public.secretaries;
DROP POLICY IF EXISTS "process_types_manage" ON public.process_types;
DROP POLICY IF EXISTS "templates_manage" ON public.templates;
DROP POLICY IF EXISTS "processes_manage" ON public.processes;
DROP POLICY IF EXISTS "documents_manage" ON public.documents;
DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;

DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;
DROP POLICY IF EXISTS "organizations_delete" ON organizations;

DROP POLICY IF EXISTS "entities_select" ON entities;
DROP POLICY IF EXISTS "entities_insert" ON entities;
DROP POLICY IF EXISTS "entities_update" ON entities;
DROP POLICY IF EXISTS "entities_delete" ON entities;

DROP POLICY IF EXISTS "process_types_select" ON process_types;
DROP POLICY IF EXISTS "process_types_insert" ON process_types;
DROP POLICY IF EXISTS "process_types_update" ON process_types;

DROP POLICY IF EXISTS "templates_select" ON templates;
DROP POLICY IF EXISTS "templates_insert" ON templates;
DROP POLICY IF EXISTS "templates_update" ON templates;

DROP POLICY IF EXISTS "processes_select" ON processes;
DROP POLICY IF EXISTS "processes_insert" ON processes;
DROP POLICY IF EXISTS "processes_update" ON processes;
DROP POLICY IF EXISTS "processes_delete" ON processes;

DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;

DROP POLICY IF EXISTS "secretaries_select" ON secretaries;
DROP POLICY IF EXISTS "secretaries_insert" ON secretaries;
DROP POLICY IF EXISTS "secretaries_update" ON secretaries;
DROP POLICY IF EXISTS "secretaries_delete" ON secretaries;

-- Helper function to get user role (safe now that profiles has no RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = user_id;
    RETURN COALESCE(user_role, 'member');
END;
$$;

-- Helper function to get user organization (safe now)
CREATE OR REPLACE FUNCTION public.get_user_org(user_id uuid)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id FROM profiles WHERE id = user_id;
    RETURN org_id;
END;
$$;

-- ORGANIZATIONS POLICIES
-- Allow anonymous users to view active organizations (for signup)
-- Also allow authenticated users based on their role
CREATE POLICY "organizations_select" ON organizations
    FOR SELECT USING (
        -- Allow anonymous users to see active organizations
        (auth.uid() IS NULL AND status = 'active') OR
        -- Allow authenticated superadmins to see all organizations
        (auth.uid() IS NOT NULL AND get_user_role(auth.uid()) = 'superadmin') OR
        -- Allow authenticated users to see their own organization
        (auth.uid() IS NOT NULL AND id = get_user_org(auth.uid()))
    );

CREATE POLICY "organizations_insert" ON organizations
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) = 'superadmin'
    );

CREATE POLICY "organizations_update" ON organizations
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        id = get_user_org(auth.uid())
    );

CREATE POLICY "organizations_delete" ON organizations
    FOR DELETE USING (
        get_user_role(auth.uid()) = 'superadmin'
    );

-- ENTITIES POLICIES
CREATE POLICY "entities_select" ON entities
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        organization_id = get_user_org(auth.uid())
    );

CREATE POLICY "entities_insert" ON entities
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        (get_user_role(auth.uid()) = 'superadmin' OR organization_id = get_user_org(auth.uid()))
    );

CREATE POLICY "entities_update" ON entities
    FOR UPDATE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        (get_user_role(auth.uid()) = 'superadmin' OR organization_id = get_user_org(auth.uid()))
    );

CREATE POLICY "entities_delete" ON entities
    FOR DELETE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        (get_user_role(auth.uid()) = 'superadmin' OR organization_id = get_user_org(auth.uid()))
    );

-- PROCESS TYPES POLICIES
CREATE POLICY "process_types_select" ON process_types
    FOR SELECT USING (true);

CREATE POLICY "process_types_insert" ON process_types
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) = 'superadmin'
    );

CREATE POLICY "process_types_update" ON process_types
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'superadmin'
    );

-- TEMPLATES POLICIES
CREATE POLICY "templates_select" ON templates
    FOR SELECT USING (true);

CREATE POLICY "templates_insert" ON templates
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) = 'superadmin'
    );

CREATE POLICY "templates_update" ON templates
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'superadmin'
    );

-- PROCESSES POLICIES
CREATE POLICY "processes_select" ON processes
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = processes.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "processes_insert" ON processes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "processes_update" ON processes
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = processes.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "processes_delete" ON processes
    FOR DELETE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = processes.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

-- DOCUMENTS POLICIES
CREATE POLICY "documents_select" ON documents
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM processes p
            JOIN entities e ON e.id = p.entity_id
            WHERE p.id = documents.process_id 
            AND e.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "documents_insert" ON documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM processes p
            JOIN entities e ON e.id = p.entity_id
            WHERE p.id = process_id 
            AND e.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "documents_update" ON documents
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM processes p
            JOIN entities e ON e.id = p.entity_id
            WHERE p.id = documents.process_id 
            AND e.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "documents_delete" ON documents
    FOR DELETE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        EXISTS (
            SELECT 1 FROM processes p
            JOIN entities e ON e.id = p.entity_id
            WHERE p.id = documents.process_id 
            AND e.organization_id = get_user_org(auth.uid())
        )
    );

-- SECRETARIES POLICIES
CREATE POLICY "secretaries_select" ON secretaries
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = secretaries.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "secretaries_insert" ON secretaries
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "secretaries_update" ON secretaries
    FOR UPDATE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = secretaries.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

CREATE POLICY "secretaries_delete" ON secretaries
    FOR DELETE USING (
        get_user_role(auth.uid()) IN ('superadmin', 'admin') AND
        EXISTS (
            SELECT 1 FROM entities 
            WHERE entities.id = secretaries.entity_id 
            AND entities.organization_id = get_user_org(auth.uid())
        )
    );

-- Verify all policies are created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;


-- --- E3 superadmin profiles (020-allow-superadmin-insert-profiles.sql) ---

-- Allow superadmins to insert profiles for new members
-- This policy allows users with role 'superadmin' to create profiles for other users

-- Security definer helper in public (auth schema is not writable on hosted Supabase)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'superadmin'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

CREATE POLICY "profiles_insert_superadmin"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin() = true);

CREATE POLICY "profiles_update_superadmin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_superadmin() = true)
WITH CHECK (public.is_superadmin() = true);



-- --- E4 superadmin view (021-allow-superadmin-view-profiles.sql) ---

-- Allow superadmins to view all profiles
-- This policy uses the get_user_role helper function which is SECURITY DEFINER
-- and can safely query the profiles table without causing recursion

-- Create policy to allow superadmins to select all profiles
CREATE POLICY "profiles_superadmin_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'superadmin'
);



-- --- E5 signup orgs (025-allow-public-organizations-view.sql) ---

-- Allow anonymous users to view active organizations for signup
-- This policy allows unauthenticated users to see organizations so they can select one during registration

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "organizations_public_select" ON public.organizations;

-- Grant SELECT permission to anon role first
GRANT SELECT ON public.organizations TO anon;

-- Create policy to allow anonymous users to view active organizations
-- This policy must allow access when auth.uid() is NULL (anonymous users)
CREATE POLICY "organizations_public_select" ON public.organizations
  FOR SELECT
  USING (
    -- Allow if user is anonymous (not authenticated) AND organization is active
    (auth.uid() IS NULL AND status = 'active')
    OR
    -- Also allow if user is authenticated and meets other criteria (for compatibility)
    (auth.uid() IS NOT NULL AND (
      -- This will be handled by other policies, but we include it for completeness
      status = 'active'
    ))
  );



-- --- F grants Supabase roles (033-grant-supabase-roles.sql) ---

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO postgres, anon, authenticated, service_role;


-- --- G bootstrap (000-bootstrap-seed.sql) ---

-- Datos mínimos para poder usar la app (orgs + tipos de proceso)

INSERT INTO organizations (id, name, nit, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Organización Demo', '900.000.000-1', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, nit = EXCLUDED.nit, status = EXCLUDED.status;

INSERT INTO process_types (id, name, description) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Contratación Directa', 'Contratación directa Ley 1150'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Licitación Pública', 'Licitación pública'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Selección Abreviada', 'Selección abreviada'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Concurso de Méritos', 'Concurso de méritos'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Mínima Cuantía', 'Mínima cuantía')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;


-- =============================================================================
-- PASO FINAL — sustituye el email y ejecuta después de registrarte en la app
-- =============================================================================
-- UPDATE profiles SET role = 'superadmin', status = 'approved', organization_id = '11111111-1111-1111-1111-111111111111'
-- WHERE email = 'tu-email@ejemplo.com';

