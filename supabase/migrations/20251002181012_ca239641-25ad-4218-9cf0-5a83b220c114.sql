-- Fix subscribers table RLS policy to use security definer function
-- This prevents potential recursive RLS issues and ensures proper admin verification

-- Drop the old policy that directly queries user_roles
DROP POLICY IF EXISTS "admins_full_subscription_access" ON public.subscribers;

-- Create new policy using the secure is_admin() function
CREATE POLICY "admins_full_subscription_access"
ON public.subscribers
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ensure unauthenticated users cannot access any subscription data
-- This adds an explicit deny for non-authenticated users
CREATE POLICY "deny_unauthenticated_access"
ON public.subscribers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);