-- Drop the overly permissive SELECT policy that exposes all affiliate data
DROP POLICY IF EXISTS "Affiliates can view own record via token" ON public.affiliates;

-- The existing policies already handle admin and service role access:
-- "Admins can view all affiliates" - SELECT for is_admin(auth.uid())
-- "Admins full access to affiliates" - ALL for is_admin()
-- "Service role full access affiliates" - ALL for service role
-- So no new policies needed - just removing the permissive one