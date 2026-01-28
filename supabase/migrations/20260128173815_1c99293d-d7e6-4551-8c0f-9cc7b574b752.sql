-- Allow authenticated users to SELECT their own photoshoots
CREATE POLICY "Users can view own photoshoots"
ON public.outfit_swap_photoshoots
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow authenticated users to INSERT their own photoshoots
CREATE POLICY "Users can insert own photoshoots"
ON public.outfit_swap_photoshoots
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to UPDATE their own photoshoots
CREATE POLICY "Users can update own photoshoots"
ON public.outfit_swap_photoshoots
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());