-- Fix existing profiles with step 0 to step 1
UPDATE profiles 
SET onboarding_step = 1 
WHERE onboarding_step = 0 OR onboarding_step IS NULL;

-- Change the default value for future users
ALTER TABLE profiles 
ALTER COLUMN onboarding_step SET DEFAULT 1;