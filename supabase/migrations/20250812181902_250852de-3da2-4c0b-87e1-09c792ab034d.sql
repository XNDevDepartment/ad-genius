
-- First, let's create a proper RPC function for atomic credit deduction
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reason TEXT DEFAULT 'image_generation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Create a function to get credit cost for image quality
CREATE OR REPLACE FUNCTION public.get_image_credit_cost(
  p_quality TEXT DEFAULT 'high',
  p_count INTEGER DEFAULT 1
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  quality_cost NUMERIC;
BEGIN
  CASE p_quality
    WHEN 'low' THEN quality_cost := 1;
    WHEN 'medium' THEN quality_cost := 1.5;
    WHEN 'high' THEN quality_cost := 2;
    ELSE quality_cost := 2; -- default to high
  END CASE;
  
  RETURN quality_cost * p_count;
END;
$$;

-- Create a function to calculate monthly credits based on subscription tier
CREATE OR REPLACE FUNCTION public.get_tier_monthly_credits(p_tier TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_tier
    WHEN 'Free' THEN RETURN 60;
    WHEN 'Pro' THEN RETURN 500;
    WHEN 'Enterprise' THEN RETURN 2000;
    ELSE RETURN 60; -- default to Free tier
  END CASE;
END;
$$;

-- Create a function to reset monthly credits
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS TABLE(user_id UUID, old_balance NUMERIC, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.subscribers
  SET 
    credits_balance = public.get_tier_monthly_credits(subscription_tier),
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
    credits_balance as new_balance;
END;
$$;

-- Allow service role to insert credit transactions
DROP POLICY IF EXISTS "insert_credits_transactions" ON public.credits_transactions;
CREATE POLICY "insert_credits_transactions" ON public.credits_transactions
  FOR INSERT
  WITH CHECK (true);

-- Allow users to insert their own credit transactions  
DROP POLICY IF EXISTS "insert_own_credits_transactions" ON public.credits_transactions;
CREATE POLICY "insert_own_credits_transactions" ON public.credits_transactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Ensure generated_images.settings always has quality field with default
UPDATE public.generated_images 
SET settings = COALESCE(settings, '{}'::jsonb) || '{"quality": "high"}'::jsonb
WHERE settings IS NULL OR NOT (settings ? 'quality');
