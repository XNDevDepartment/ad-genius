-- Fix admin policy to properly handle INSERT operations
-- The issue: FOR ALL policies need both USING and WITH CHECK clauses
-- USING applies to SELECT, UPDATE, DELETE
-- WITH CHECK applies to INSERT and UPDATE

-- Drop the existing admin policy
DROP POLICY IF EXISTS "Admins full access to base models" ON public.outfit_swap_base_models;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins full access to base models"
  ON public.outfit_swap_base_models
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());