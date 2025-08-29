-- Drop and recreate function with rollover credits logic
DROP FUNCTION IF EXISTS public.reset_monthly_credits();

-- Update reset function to add credits instead of replacing them (roll over)
CREATE OR REPLACE FUNCTION public.reset_user_monthly_credits(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_tier TEXT;
  monthly_allowance NUMERIC;
  current_balance NUMERIC;
  new_balance NUMERIC;
  result JSONB;
BEGIN
  -- Get user's current subscription tier and balance
  SELECT subscription_tier, credits_balance INTO current_tier, current_balance
  FROM public.subscribers
  WHERE user_id = p_user_id;
  
  -- Check if user exists
  IF current_tier IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get monthly allowance for the tier
  monthly_allowance := public.get_tier_monthly_credits(current_tier);
  
  -- Add credits to existing balance (roll over)
  new_balance := current_balance + monthly_allowance;
  
  -- Update credits balance
  UPDATE public.subscribers
  SET 
    credits_balance = new_balance,
    last_reset_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction
  INSERT INTO public.credits_transactions (user_id, amount, reason, metadata)
  VALUES (p_user_id, monthly_allowance, 'monthly_rollover', jsonb_build_object('tier', current_tier, 'previous_balance', current_balance));
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', current_balance,
    'new_balance', new_balance,
    'tier', current_tier,
    'credits_added', monthly_allowance
  );
END;
$function$;

-- Recreate monthly reset function to use rollover logic  
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS TABLE(user_id uuid, old_balance numeric, new_balance numeric, credits_added numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.subscribers
  SET 
    credits_balance = credits_balance + public.get_tier_monthly_credits(subscription_tier),
    last_reset_at = now(),
    updated_at = now()
  WHERE 
    -- Reset if it's been more than 30 days since last reset
    (last_reset_at IS NULL OR last_reset_at < now() - INTERVAL '30 days')
    -- Only reset for active subscriptions or free tier
    AND (subscribed = true OR subscription_tier = 'Free')
  RETURNING 
    subscribers.user_id,
    credits_balance - public.get_tier_monthly_credits(subscription_tier) as old_balance,
    credits_balance as new_balance,
    public.get_tier_monthly_credits(subscription_tier) as credits_added;
END;
$function$;