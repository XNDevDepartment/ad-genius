-- Update all users' credit balances to match their subscription tier allowances
-- This ensures everyone has the correct credits based on their current plan

-- First, let's see the current state and what needs to be updated
-- Update credit balances for all users based on their subscription tier
UPDATE public.subscribers 
SET 
  credits_balance = public.get_tier_monthly_credits(subscription_tier),
  last_reset_at = now(),
  updated_at = now()
WHERE 
  -- Update everyone to ensure consistency
  TRUE;

-- Insert transaction records for this mass credit adjustment
INSERT INTO public.credits_transactions (user_id, amount, reason, metadata)
SELECT 
  s.user_id,
  public.get_tier_monthly_credits(s.subscription_tier) - COALESCE(s.credits_balance, 0) as amount_difference,
  'balance_correction',
  jsonb_build_object(
    'tier', s.subscription_tier,
    'old_balance', COALESCE(s.credits_balance, 0),
    'new_balance', public.get_tier_monthly_credits(s.subscription_tier),
    'correction_date', now()
  )
FROM public.subscribers s
WHERE 
  -- Only create transaction records where there's actually a difference
  COALESCE(s.credits_balance, 0) != public.get_tier_monthly_credits(s.subscription_tier);

-- Ensure all users have proper subscriber records
-- Create subscriber records for any authenticated users who don't have them
INSERT INTO public.subscribers (user_id, email, subscription_tier, subscribed, credits_balance, last_reset_at, created_at, updated_at)
SELECT 
  p.id as user_id,
  p.email,
  'Free' as subscription_tier,
  false as subscribed,
  60 as credits_balance, -- Free tier gets 60 credits
  now() as last_reset_at,
  now() as created_at,
  now() as updated_at
FROM public.profiles p
LEFT JOIN public.subscribers s ON p.id = s.user_id
WHERE s.user_id IS NULL;

-- Add transaction records for new subscribers
INSERT INTO public.credits_transactions (user_id, amount, reason, metadata)
SELECT 
  p.id as user_id,
  60 as amount,
  'initial_credit_grant',
  jsonb_build_object(
    'tier', 'Free',
    'initial_setup', true,
    'grant_date', now()
  )
FROM public.profiles p
LEFT JOIN public.subscribers s ON p.id = s.user_id
WHERE s.user_id IS NULL;