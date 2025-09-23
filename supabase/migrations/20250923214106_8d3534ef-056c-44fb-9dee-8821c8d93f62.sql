-- Update get_tier_monthly_credits function to include Founders tier
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
    when 'Founders' then return 80; -- Same as Starter but lifetime
    else return 10; -- default safety fallback
  end case;
end;
$function$