-- Add user-level RLS policies for outfit_swap_jobs
-- Users need to view their own jobs to see the job cards

CREATE POLICY "Users can view own jobs" 
ON public.outfit_swap_jobs 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own jobs" 
ON public.outfit_swap_jobs 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own jobs" 
ON public.outfit_swap_jobs 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

-- Add user-level RLS policies for outfit_swap_results
-- Users need to view their own results to see the generated images

CREATE POLICY "Users can view own results" 
ON public.outfit_swap_results 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own results" 
ON public.outfit_swap_results 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own results" 
ON public.outfit_swap_results 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());