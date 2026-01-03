-- Reset onboarding for aigenius.xn@gmail.com
UPDATE profiles 
SET onboarding_completed = false, onboarding_step = 0, onboarding_data = NULL
WHERE id = '4e962775-cb55-4301-bc33-081eacb96c46';

-- Reset onboarding for francisco.forte1605@gmail.com
UPDATE profiles 
SET onboarding_completed = false, onboarding_step = 0, onboarding_data = NULL
WHERE id = '579588c8-f63e-4ba8-84ec-4419303abf7c';

-- Reset bonus credits for both users (so they can generate again)
UPDATE onboarding_bonus_credits 
SET images_used = 0, video_used = false, updated_at = now()
WHERE user_id IN ('4e962775-cb55-4301-bc33-081eacb96c46', '579588c8-f63e-4ba8-84ec-4419303abf7c');