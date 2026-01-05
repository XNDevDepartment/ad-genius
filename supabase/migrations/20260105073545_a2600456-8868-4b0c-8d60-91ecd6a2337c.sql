-- Drop the overly permissive RLS policy on affiliates table
DROP POLICY IF EXISTS "Affiliates can view own record via token" ON public.affiliates;

-- Since affiliate access is now handled exclusively through the edge function
-- (which uses service role key), we need a restrictive policy for affiliates.
-- Only admins should be able to directly query the affiliates table.

-- Create admin-only SELECT policy
CREATE POLICY "Admins can view all affiliates" 
  ON public.affiliates FOR SELECT 
  USING (public.is_admin(auth.uid()));

-- Create admin-only UPDATE policy (if not exists)
DROP POLICY IF EXISTS "Admins can update affiliates" ON public.affiliates;
CREATE POLICY "Admins can update affiliates" 
  ON public.affiliates FOR UPDATE 
  USING (public.is_admin(auth.uid()));

-- Ensure RLS is enabled
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;