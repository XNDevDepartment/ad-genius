CREATE OR REPLACE FUNCTION public.calculate_image_cost(p_settings jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  number_of_images INT := 1;
  size_str TEXT;
  width_val INT;
  cost_per_image NUMERIC := 1;
BEGIN
  number_of_images := COALESCE((p_settings->>'number')::INT, 1);
  size_str := COALESCE(p_settings->>'size', '1024x1024');
  width_val := COALESCE(split_part(size_str, 'x', 1)::INT, 1024);
  IF width_val >= 2800 THEN
    cost_per_image := 3;
  ELSIF width_val >= 1700 THEN
    cost_per_image := 2;
  ELSE
    cost_per_image := 1;
  END IF;
  RETURN number_of_images * cost_per_image;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_image_credit_cost(p_quality text DEFAULT 'high'::text, p_count integer DEFAULT 1, p_size text DEFAULT '1024x1024'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  width_val INT;
  cost_per_image NUMERIC := 1;
BEGIN
  width_val := COALESCE(split_part(p_size, 'x', 1)::INT, 1024);
  IF width_val >= 2800 THEN
    cost_per_image := 3;
  ELSIF width_val >= 1700 THEN
    cost_per_image := 2;
  ELSE
    cost_per_image := 1;
  END IF;
  RETURN cost_per_image * p_count;
END;
$function$;