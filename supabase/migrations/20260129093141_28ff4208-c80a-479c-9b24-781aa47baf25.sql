-- Drop the misconfigured RLS policy that targets 'public' role incorrectly
-- Service role bypasses RLS by default, so no replacement needed
DROP POLICY IF EXISTS "Service role can insert outfit swap results" 
ON public.outfit_swap_results;