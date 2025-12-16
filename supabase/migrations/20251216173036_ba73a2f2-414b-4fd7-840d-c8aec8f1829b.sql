-- Add unique constraint on phone_number in profiles table
-- This ensures no two accounts can have the same phone number

-- First, check for any duplicate phone numbers and clear them (keeping the most recent)
WITH duplicates AS (
  SELECT id, phone_number, created_at,
         ROW_NUMBER() OVER (PARTITION BY phone_number ORDER BY created_at DESC) as rn
  FROM public.profiles
  WHERE phone_number IS NOT NULL AND phone_number != ''
)
UPDATE public.profiles 
SET phone_number = NULL, phone_verified = false
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Create unique index on phone_number (allows NULL values, but only one non-null per value)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_number_unique 
ON public.profiles (phone_number) 
WHERE phone_number IS NOT NULL AND phone_number != '';

-- Add comment explaining the constraint
COMMENT ON INDEX idx_profiles_phone_number_unique IS 'Ensures each phone number can only be used by one account';