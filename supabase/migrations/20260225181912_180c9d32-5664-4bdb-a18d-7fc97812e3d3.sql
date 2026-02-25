-- Create helper functions for admin revenue stats (used by edge function)
CREATE OR REPLACE FUNCTION public.admin_sum_credits_used()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(ABS(amount)), 0)
  FROM public.credits_transactions
  WHERE amount < 0;
$$;

CREATE OR REPLACE FUNCTION public.admin_sum_credits_balance()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(credits_balance), 0)
  FROM public.subscribers;
$$;