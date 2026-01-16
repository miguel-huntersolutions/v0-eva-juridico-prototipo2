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

