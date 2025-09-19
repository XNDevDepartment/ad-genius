-- Fix all functions by adding search_path = 'public' for security
-- This fixes the "Function Search Path Mutable" security warning

-- Fix get_tier_monthly_credits function 
CREATE OR REPLACE FUNCTION public.get_tier_monthly_credits(p_tier text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path = 'public'
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

-- Fix get_image_credit_cost function
CREATE OR REPLACE FUNCTION public.get_image_credit_cost(p_quality text DEFAULT 'high'::text, p_count integer DEFAULT 1)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path = 'public'
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

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, profession, account_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'profession', ''),
    COALESCE(NEW.raw_user_meta_data->>'account_id', 'ACC' || extract(epoch from now())::bigint)
  );
  RETURN NEW;
END;
$function$;