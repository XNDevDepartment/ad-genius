-- Drop the remaining overly permissive policy that uses USING (true)
DROP POLICY IF EXISTS "Affiliates can view own record via token" ON public.affiliates;