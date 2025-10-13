-- Update the calculate_image_cost function to always return 1 credit per image
CREATE OR REPLACE FUNCTION public.calculate_image_cost(p_settings jsonb)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  number_of_images INT := 1;
BEGIN
  -- Extract number of images
  number_of_images := COALESCE((p_settings->>'number')::INT, 1);
  
  -- Fixed cost: 1 credit per image regardless of quality or size
  RETURN number_of_images * 1;
END;
$function$;

-- Update the get_image_credit_cost function to always return 1 credit per image
CREATE OR REPLACE FUNCTION public.get_image_credit_cost(p_quality text DEFAULT 'high'::text, p_count integer DEFAULT 1)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Fixed cost: 1 credit per image regardless of quality
  RETURN 1 * p_count;
END;
$function$;