-- Fix security warnings by updating function search paths

-- Update get_image_credit_cost function to have secure search_path
CREATE OR REPLACE FUNCTION public.get_image_credit_cost(
  p_quality TEXT DEFAULT 'high',
  p_count INTEGER DEFAULT 1
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
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

-- Update get_tier_monthly_credits function to have secure search_path
CREATE OR REPLACE FUNCTION public.get_tier_monthly_credits(p_tier TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
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