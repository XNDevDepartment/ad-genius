-- Fix remaining functions with search_path issues

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update calculate_image_cost function
CREATE OR REPLACE FUNCTION public.calculate_image_cost(p_settings jsonb)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
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

-- Update generate_idempotency_key function
CREATE OR REPLACE FUNCTION public.generate_idempotency_key(p_user_id uuid, p_source_image_id uuid, p_prompt text, p_settings jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  content_string TEXT;
BEGIN
  content_string := p_user_id::TEXT || 
    COALESCE(p_source_image_id::TEXT, '') || 
    p_prompt || 
    p_settings::TEXT;
  
  RETURN encode(digest(content_string, 'sha256'), 'hex');
END;
$function$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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