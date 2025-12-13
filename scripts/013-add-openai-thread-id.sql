-- Add OpenAI thread_id field to conversations table
-- This field stores the OpenAI Assistant API thread ID for maintaining conversation context

-- Add the column
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS openai_thread_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_openai_thread_id ON conversations(openai_thread_id);

-- Add comment to document the field
COMMENT ON COLUMN conversations.openai_thread_id IS 'OpenAI Assistant API thread ID for maintaining conversation context with workflow assistants';

