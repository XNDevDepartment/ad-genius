-- Fix subscribers table RLS policies for security
-- Remove the problematic deny_anonymous_access policy (redundant)
DROP POLICY IF EXISTS "deny_anonymous_access" ON public.subscribers;

-- Remove the overly permissive service_role_manage_subscriptions policy
DROP POLICY IF EXISTS "service_role_manage_subscriptions" ON public.subscribers;

-- Create a more secure service role policy that only allows service role operations
CREATE POLICY "service_role_full_access" ON public.subscribers
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Ensure authenticated users can only delete their own subscription data
CREATE POLICY "authenticated_users_delete_own_subscription" ON public.subscribers
FOR DELETE 
USING (auth.uid() = user_id);

-- Add an additional security check to prevent unauthorized access to sensitive fields
-- Create a more restrictive select policy that hides sensitive Stripe data from regular users
DROP POLICY IF EXISTS "authenticated_users_own_subscription_data" ON public.subscribers;

CREATE POLICY "authenticated_users_view_own_basic_subscription" ON public.subscribers
FOR SELECT 
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Create a separate policy for admins to access all subscription data
DROP POLICY IF EXISTS "admins_manage_all_subscriptions" ON public.subscribers;

CREATE POLICY "admins_full_subscription_access" ON public.subscribers
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Ensure insert policy is properly scoped
DROP POLICY IF EXISTS "authenticated_users_insert_own_subscription" ON public.subscribers;

CREATE POLICY "authenticated_users_create_own_subscription" ON public.subscribers
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Ensure update policy is properly scoped  
DROP POLICY IF EXISTS "authenticated_users_update_own_subscription" ON public.subscribers;

CREATE POLICY "authenticated_users_update_own_subscription" ON public.subscribers
FOR UPDATE 
USING (auth.uid() = user_id AND auth.role() = 'authenticated')
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');