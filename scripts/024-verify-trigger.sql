-- Verify that the trigger is correctly configured
-- Run this script to check if the trigger exists and is working

-- Check if the function exists
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check if the trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check if the status column exists in profiles table
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'status';

-- Test: Check recent profiles to see their status
SELECT 
  id,
  email,
  name,
  role,
  status,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

