-- Fix remaining functions with search path
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