-- Fix remaining functions with search_path parameter

-- Fix reset_user_monthly_credits function (already done but may need re-application)
CREATE OR REPLACE FUNCTION public.reset_user_monthly_credits(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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

-- Fix calculate_image_cost function
CREATE OR REPLACE FUNCTION public.calculate_image_cost(p_settings jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = 'public'
AS $function$
DECLARE
  base_cost NUMERIC := 1;
  quality_multiplier NUMERIC := 1;
  size_multiplier NUMERIC := 1;
  number_of_images INT := 1;
BEGIN
  -- Extract settings
  number_of_images := COALESCE((p_settings->>'number')::INT, 1);
  
  -- Quality multiplier
  CASE COALESCE(p_settings->>'quality', 'standard')
    WHEN 'hd' THEN quality_multiplier := 2;
    ELSE quality_multiplier := 1;
  END CASE;
  
  -- Size multiplier (larger images cost more)
  CASE COALESCE(p_settings->>'size', '1024x1024')
    WHEN '1536x1024', '1024x1536' THEN size_multiplier := 1.5;
    ELSE size_multiplier := 1;
  END CASE;
  
  RETURN number_of_images * base_cost * quality_multiplier * size_multiplier;
END;
$function$;

-- Fix reset_monthly_credits function
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
 RETURNS TABLE(user_id uuid, old_balance numeric, new_balance numeric, credits_added numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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

-- Fix deduct_user_credits function
CREATE OR REPLACE FUNCTION public.deduct_user_credits(p_user_id uuid, p_amount numeric, p_reason text DEFAULT 'image_generation'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
  result JSONB;
BEGIN
  -- Lock the subscriber row for update
  SELECT credits_balance INTO current_balance
  FROM public.subscribers
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if user has enough credits
  IF current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient credits',
      'current_balance', current_balance,
      'required', p_amount
    );
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance - p_amount;
  
  -- Update the balance
  UPDATE public.subscribers
  SET credits_balance = new_balance,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction
  INSERT INTO public.credits_transactions (user_id, amount, reason)
  VALUES (p_user_id, -p_amount, p_reason);
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', current_balance,
    'new_balance', new_balance,
    'amount_deducted', p_amount
  );
END;
$function$;

-- Fix refund_user_credits function
CREATE OR REPLACE FUNCTION public.refund_user_credits(p_user_id uuid, p_amount numeric, p_reason text DEFAULT 'refund'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
  result JSONB;
BEGIN
  -- Lock the subscriber row for update
  SELECT credits_balance INTO current_balance
  FROM public.subscribers
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance + p_amount;
  
  -- Update the balance
  UPDATE public.subscribers
  SET credits_balance = new_balance,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction
  INSERT INTO public.credits_transactions (user_id, amount, reason)
  VALUES (p_user_id, p_amount, p_reason);
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', current_balance,
    'new_balance', new_balance,
    'amount_refunded', p_amount
  );
END;
$function$;