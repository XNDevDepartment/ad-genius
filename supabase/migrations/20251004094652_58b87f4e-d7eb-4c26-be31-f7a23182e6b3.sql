-- Security Fix: Properly secure subscribers table payment data
-- Issue: Payment and subscription data accessible without proper authentication controls

-- ============================================================================
-- 1. Drop all existing RLS policies on subscribers table
-- ============================================================================
DROP POLICY IF EXISTS "admins_full_subscription_access" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_create_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_delete_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_view_own_basic_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "deny_unauthenticated_access" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_full_access" ON public.subscribers;

-- ============================================================================
-- 2. Ensure RLS is enabled
-- ============================================================================
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (extra security layer)
ALTER TABLE public.subscribers FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Create restrictive policies in correct order
-- ============================================================================

-- Policy 1: Explicit DENY for all unauthenticated access (anon role)
-- This is RESTRICTIVE and blocks all operations for non-authenticated users
CREATE POLICY "deny_all_unauthenticated_access"
ON public.subscribers
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Policy 2: Explicit DENY for public role (extra security)
CREATE POLICY "deny_all_public_access"
ON public.subscribers
AS RESTRICTIVE
FOR ALL
TO public
USING (false);

-- Policy 3: Authenticated users can only SELECT their own subscription data
CREATE POLICY "authenticated_users_view_own_subscription"
ON public.subscribers
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Policy 4: Authenticated users can only INSERT their own subscription
CREATE POLICY "authenticated_users_create_own_subscription"
ON public.subscribers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Policy 5: Authenticated users can only UPDATE their own subscription
-- IMPORTANT: Prevents users from modifying stripe_customer_id or subscription_tier
-- Only allow updates to safe fields
CREATE POLICY "authenticated_users_update_own_subscription"
ON public.subscribers
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Policy 6: Authenticated users can DELETE their own subscription
CREATE POLICY "authenticated_users_delete_own_subscription"
ON public.subscribers
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Policy 7: Admins have full access (using security definer function)
CREATE POLICY "admins_full_access"
ON public.subscribers
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy 8: Service role has full access (for webhooks and backend operations)
-- Service role bypasses RLS by default, but we define this for clarity
CREATE POLICY "service_role_full_access"
ON public.subscribers
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 4. Add additional security: Create audit trigger for sensitive changes
-- ============================================================================

-- Create audit log table for subscribers changes (optional but recommended)
CREATE TABLE IF NOT EXISTS public.subscribers_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.subscribers_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "admins_can_view_audit_logs"
ON public.subscribers_audit_log
FOR SELECT
USING (public.is_admin());

-- Create trigger function to log sensitive changes
CREATE OR REPLACE FUNCTION public.log_subscriber_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log changes to sensitive fields
  IF (TG_OP = 'UPDATE' AND (
    OLD.stripe_customer_id IS DISTINCT FROM NEW.stripe_customer_id OR
    OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier OR
    OLD.credits_balance IS DISTINCT FROM NEW.credits_balance OR
    OLD.subscribed IS DISTINCT FROM NEW.subscribed
  )) THEN
    INSERT INTO public.subscribers_audit_log (
      user_id,
      action,
      old_data,
      new_data,
      changed_by
    ) VALUES (
      NEW.user_id,
      TG_OP,
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_log_subscriber_changes ON public.subscribers;
CREATE TRIGGER trg_log_subscriber_changes
AFTER UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION public.log_subscriber_changes();

-- ============================================================================
-- 5. Add helpful comments
-- ============================================================================
COMMENT ON TABLE public.subscribers IS 'Contains sensitive payment and subscription data. Access is strictly controlled via RLS policies. Only authenticated users can view their own records.';
COMMENT ON COLUMN public.subscribers.stripe_customer_id IS 'SENSITIVE: Stripe customer identifier. Never expose to clients.';
COMMENT ON COLUMN public.subscribers.credits_balance IS 'User credit balance. Modifications should only occur via secure backend functions.';
COMMENT ON COLUMN public.subscribers.subscription_tier IS 'SENSITIVE: User subscription level. Should only be modified by backend payment webhooks.';