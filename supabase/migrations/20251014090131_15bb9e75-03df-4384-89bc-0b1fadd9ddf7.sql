-- Add DELETE policy for authenticated users on kling_jobs table
CREATE POLICY "Users can delete their own kling jobs"
ON public.kling_jobs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);