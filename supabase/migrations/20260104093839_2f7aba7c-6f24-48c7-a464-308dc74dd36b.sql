-- Mark all existing users (created before onboarding feature) as having completed onboarding
-- This ensures only new users see the onboarding wizard
UPDATE profiles 
SET 
  onboarding_completed = true,
  onboarding_step = 5,
  updated_at = NOW()
WHERE created_at < '2026-01-01 00:00:00+00'
  AND (onboarding_completed = false OR onboarding_completed IS NULL);