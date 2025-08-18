-- Fix RLS policies for credits_transactions table
DROP POLICY IF EXISTS "insert_credits_transactions" ON public.credits_transactions;
DROP POLICY IF EXISTS "insert_own_credits_transactions" ON public.credits_transactions;
DROP POLICY IF EXISTS "select_own_credits_transactions" ON public.credits_transactions;

-- Create proper RLS policies for credits_transactions
CREATE POLICY "Users can view their own credit transactions" 
ON public.credits_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit transactions" 
ON public.credits_transactions 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Service role can insert credit transactions" 
ON public.credits_transactions 
FOR INSERT 
WITH CHECK (true);

-- Create function to reset user monthly credits
CREATE OR REPLACE FUNCTION public.reset_user_monthly_credits(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_tier TEXT;
  monthly_allowance NUMERIC;
  result JSONB;
BEGIN
  -- Get user's current subscription tier
  SELECT subscription_tier INTO current_tier
  FROM public.subscribers
  WHERE user_id = p_user_id;
  
  -- Check if user exists
  IF current_tier IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get monthly allowance for the tier
  monthly_allowance := public.get_tier_monthly_credits(current_tier);
  
  -- Reset credits balance
  UPDATE public.subscribers
  SET 
    credits_balance = monthly_allowance,
    last_reset_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction
  INSERT INTO public.credits_transactions (user_id, amount, reason, metadata)
  VALUES (p_user_id, monthly_allowance, 'monthly_reset', jsonb_build_object('tier', current_tier));
  
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', monthly_allowance,
    'tier', current_tier
  );
END;
$function$;

-- Create function to refund user credits
CREATE OR REPLACE FUNCTION public.refund_user_credits(p_user_id uuid, p_amount numeric, p_reason text DEFAULT 'refund')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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