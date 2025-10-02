-- Fix credit duplication issue and clean up excess credits

-- First, let's look at the duplicate allocations for the affected user
-- User has 159 credits but should have 80 (Founders tier)
-- Excess credits: 159 - 80 = 79

-- Create a function to prevent rapid credit allocations
CREATE OR REPLACE FUNCTION public.check_recent_credit_allocation(p_user_id uuid, p_reason text, p_hours_threshold integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_allocation_exists boolean;
BEGIN
  -- Check if there's been a similar allocation in the past X hours
  SELECT EXISTS(
    SELECT 1 
    FROM public.credits_transactions
    WHERE user_id = p_user_id
      AND reason = p_reason
      AND amount > 0
      AND created_at > NOW() - INTERVAL '1 hour' * p_hours_threshold
  ) INTO recent_allocation_exists;
  
  RETURN recent_allocation_exists;
END;
$$;

-- Add a check constraint to the credits_transactions table to prevent negative balances
-- (this is more of a safeguard)
ALTER TABLE public.subscribers 
  DROP CONSTRAINT IF EXISTS credits_balance_non_negative;

ALTER TABLE public.subscribers 
  ADD CONSTRAINT credits_balance_non_negative 
  CHECK (credits_balance >= 0);

-- Clean up the specific user's excess credits
-- User ID for aigenius.xn@gmail.com
-- Current balance: 159, should be: 80, excess: 79
UPDATE public.subscribers
SET 
  credits_balance = 80,
  updated_at = NOW()
WHERE email = 'aigenius.xn@gmail.com';

-- Add a comment explaining the safeguards
COMMENT ON FUNCTION public.check_recent_credit_allocation IS 
'Checks if credits were allocated recently to prevent duplicate allocations. Used by edge functions to ensure idempotency.';