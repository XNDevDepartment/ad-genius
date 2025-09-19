-- Fix Function Search Path Mutable security warnings
-- Add search_path = 'public' to all functions for security

-- Fix reset_user_monthly_credits function
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

-- Fix get_gemini_conversations_with_latest_message function
CREATE OR REPLACE FUNCTION public.get_gemini_conversations_with_latest_message(p_user_id uuid)
 RETURNS TABLE(conversation_id uuid, niche text, audience text, image_url text, image_analysis text, conversation_created_at timestamp with time zone, conversation_updated_at timestamp with time zone, latest_message_content text, latest_message_role text, latest_message_created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    gc.id as conversation_id,
    gc.niche,
    gc.audience,
    gc.image_url,
    gc.image_analysis,
    gc.created_at as conversation_created_at,
    gc.updated_at as conversation_updated_at,
    gm.content as latest_message_content,
    gm.role as latest_message_role,
    gm.created_at as latest_message_created_at
  FROM public.gemini_conversations gc
  LEFT JOIN LATERAL (
    SELECT content, role, created_at
    FROM public.gemini_messages
    WHERE conversation_id = gc.id
    ORDER BY created_at DESC
    LIMIT 1
  ) gm ON true
  WHERE gc.user_id = p_user_id
  ORDER BY gc.updated_at DESC;
$function$;

-- Fix generate_idempotency_key function
CREATE OR REPLACE FUNCTION public.generate_idempotency_key(p_user_id uuid, p_source_image_id uuid, p_prompt text, p_settings jsonb)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path = 'public'
AS $function$
  select encode(
           digest(
             convert_to(
               coalesce(p_user_id::text,'') || '|' ||
               coalesce(p_source_image_id::text,'') || '|' ||
               regexp_replace(coalesce(p_prompt,''), '\s+', ' ', 'g') || '|' ||
               coalesce(p_settings::text,''),
               'UTF8'
             ),
             'sha256'::text
           ),
           'hex'
         );
$function$;

-- Fix get_gemini_conversation_message_count function
CREATE OR REPLACE FUNCTION public.get_gemini_conversation_message_count(p_conversation_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT COUNT(*)::integer
  FROM public.gemini_messages
  WHERE conversation_id = p_conversation_id;
$function$;

-- Fix cleanup_old_gemini_conversations function
CREATE OR REPLACE FUNCTION public.cleanup_old_gemini_conversations(p_days_old integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete conversations older than specified days with no recent activity
  DELETE FROM public.gemini_conversations
  WHERE created_at < NOW() - INTERVAL '1 day' * p_days_old
    AND updated_at < NOW() - INTERVAL '1 day' * p_days_old
    AND NOT EXISTS (
      SELECT 1 FROM public.gemini_messages 
      WHERE conversation_id = gemini_conversations.id 
        AND created_at > NOW() - INTERVAL '1 day' * (p_days_old / 2)
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- Fix search_gemini_conversations function
CREATE OR REPLACE FUNCTION public.search_gemini_conversations(p_user_id uuid, p_search_term text, p_limit integer DEFAULT 10)
 RETURNS TABLE(conversation_id uuid, niche text, audience text, image_analysis text, created_at timestamp with time zone, updated_at timestamp with time zone, relevance_score real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    gc.id as conversation_id,
    gc.niche,
    gc.audience,
    gc.image_analysis,
    gc.created_at,
    gc.updated_at,
    -- Simple relevance scoring based on text similarity
    GREATEST(
      CASE WHEN gc.niche ILIKE '%' || p_search_term || '%' THEN 1.0 ELSE 0.0 END,
      CASE WHEN gc.audience ILIKE '%' || p_search_term || '%' THEN 0.8 ELSE 0.0 END,
      CASE WHEN gc.image_analysis ILIKE '%' || p_search_term || '%' THEN 0.6 ELSE 0.0 END,
      CASE WHEN EXISTS(
        SELECT 1 FROM public.gemini_messages gm 
        WHERE gm.conversation_id = gc.id 
          AND gm.content ILIKE '%' || p_search_term || '%'
      ) THEN 0.4 ELSE 0.0 END
    ) as relevance_score
  FROM public.gemini_conversations gc
  WHERE gc.user_id = p_user_id
    AND (
      gc.niche ILIKE '%' || p_search_term || '%'
      OR gc.audience ILIKE '%' || p_search_term || '%'
      OR gc.image_analysis ILIKE '%' || p_search_term || '%'
      OR EXISTS(
        SELECT 1 FROM public.gemini_messages gm 
        WHERE gm.conversation_id = gc.id 
          AND gm.content ILIKE '%' || p_search_term || '%'
      )
    )
  ORDER BY relevance_score DESC, gc.updated_at DESC
  LIMIT p_limit;
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

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = check_user_id AND role = 'admin'
  );
$function$;

-- Fix is_user_admin function
CREATE OR REPLACE FUNCTION public.is_user_admin(check_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = check_user_id AND role = 'admin'
  );
END;
$function$;

-- Fix get_public_showcase_images function
CREATE OR REPLACE FUNCTION public.get_public_showcase_images()
 RETURNS TABLE(id uuid, prompt text, public_url text, storage_path text, settings jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
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