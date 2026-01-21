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

