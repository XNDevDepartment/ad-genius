-- Fix domain_rules security issue - restrict to service role only
DROP POLICY IF EXISTS "Public can view domain rules" ON public.domain_rules;

-- Create restrictive policy (service role bypasses RLS, this blocks all others)
CREATE POLICY "Only service role can access domain rules"
  ON public.domain_rules FOR SELECT
  USING (false);