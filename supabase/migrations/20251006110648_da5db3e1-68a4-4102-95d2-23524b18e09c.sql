-- Fix subscribers table RLS policies
-- Remove redundant and confusing "deny all" policies
-- Keep only explicit ALLOW policies for proper security

-- Drop the confusing deny policies
DROP POLICY IF EXISTS "deny_all_public_access" ON public.subscribers;
DROP POLICY IF EXISTS "deny_all_unauthenticated_access" ON public.subscribers;

-- Verify RLS is enabled (it should be, but let's be explicit)
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (recommended for security)
ALTER TABLE public.subscribers FORCE ROW LEVEL SECURITY;

-- Keep existing allow policies (these are correct):
-- ✓ authenticated_users_view_own_subscription - users can view their own data
-- ✓ authenticated_users_create_own_subscription - users can create their own records
-- ✓ authenticated_users_update_own_subscription - users can update their own data
-- ✓ authenticated_users_delete_own_subscription - users can delete their own data
-- ✓ service_role_full_access - backend can manage all data
-- ✓ admins_full_access - admins can manage all data

-- These policies already exist and provide proper protection:
-- 1. Only authenticated users can access their OWN subscription data
-- 2. Service role (backend) can access all data for Stripe webhooks/sync
-- 3. Admins can access all data for support/management

-- The default-deny behavior of RLS means:
-- - Unauthenticated users: NO ACCESS (no matching policies)
-- - Authenticated users: Can ONLY see their own data (user_id = auth.uid())
-- - Service role: Full access (for backend operations)
-- - Admins: Full access (for management)