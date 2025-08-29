
-- 1) Update the monthly credits allowance per subscription tier
create or replace function public.get_tier_monthly_credits(p_tier text)
returns numeric
language plpgsql
immutable
security definer
set search_path = ''
as $function$
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

-- 2) Set default free credits to 10 for new users in subscribers
alter table public.subscribers
  alter column credits_balance set default 10;

-- OPTIONAL: If you want to immediately conform all existing Free users to 10 credits,
-- uncomment the UPDATE below. Otherwise they'll retain their current balance until the next reset.
-- update public.subscribers
-- set credits_balance = 10
-- where subscription_tier = 'Free'
--   and (credits_balance is null or credits_balance > 10);
