-- Fix outfit_swap_jobs policy to include WITH CHECK clause
DROP POLICY IF EXISTS "Admins can do everything on outfit_swap_jobs" ON public.outfit_swap_jobs;

CREATE POLICY "Admins can do everything on outfit_swap_jobs"
  ON public.outfit_swap_jobs FOR ALL 
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Fix outfit_swap_batches service role policy to include WITH CHECK
DROP POLICY IF EXISTS "Service role can manage batches" ON public.outfit_swap_batches;

CREATE POLICY "Service role can manage batches"
  ON public.outfit_swap_batches FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add admin policies for outfit_swap_batches
CREATE POLICY "Admins can insert batches"
  ON public.outfit_swap_batches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update batches"
  ON public.outfit_swap_batches FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete batches"
  ON public.outfit_swap_batches FOR DELETE
  TO authenticated
  USING (public.is_admin());