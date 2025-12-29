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

