-- Fix all functions to have proper search_path to resolve security warnings

-- Update get_tier_monthly_credits function
CREATE OR REPLACE FUNCTION public.get_tier_monthly_credits(p_tier text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  case p_tier
    when 'Free' then return 10;
    when 'Starter' then return 80;
    when 'Plus' then return 200;
    when 'Pro' then return 400;
    else return 10; -- default safety fallback
  end case;
end;
$function$;

-- Update get_image_credit_cost function
CREATE OR REPLACE FUNCTION public.get_image_credit_cost(p_quality text DEFAULT 'high'::text, p_count integer DEFAULT 1)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Update deduct_user_credits function
CREATE OR REPLACE FUNCTION public.deduct_user_credits(p_user_id uuid, p_amount numeric, p_reason text DEFAULT 'image_generation'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Update refund_user_credits function
CREATE OR REPLACE FUNCTION public.refund_user_credits(p_user_id uuid, p_amount numeric, p_reason text DEFAULT 'refund'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Update is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = check_user_id AND role = 'admin'
  );
$function$;

-- Update is_user_admin function
CREATE OR REPLACE FUNCTION public.is_user_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = check_user_id AND role = 'admin'
  );
END;
$function$;

-- Update get_public_showcase_images function
CREATE OR REPLACE FUNCTION public.get_public_showcase_images()
RETURNS TABLE(id uuid, prompt text, public_url text, storage_path text, settings jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    gi.id,
    gi.prompt,
    gi.public_url,
    gi.storage_path,
    gi.settings,
    gi.created_at,
    gi.updated_at
  FROM public.generated_images gi
  WHERE gi.public_showcase = true
  ORDER BY gi.created_at DESC;
$function$;