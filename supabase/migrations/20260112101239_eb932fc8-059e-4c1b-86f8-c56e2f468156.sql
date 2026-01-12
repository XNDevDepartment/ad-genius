-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can read active prompts" ON public.ai_prompts;

-- Create a new policy that only allows admins to read prompts
-- Service role bypasses RLS automatically, so no explicit policy needed for it
CREATE POLICY "Only admins can read prompts"
ON public.ai_prompts
FOR SELECT
USING (is_admin());