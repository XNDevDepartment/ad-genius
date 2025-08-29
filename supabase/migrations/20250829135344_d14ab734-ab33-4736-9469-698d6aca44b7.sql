-- Add getActiveJob action handler to the UGC edge function
-- This will be handled in the edge function code, no database changes needed for now

-- However, we should add an index to improve performance for finding active jobs
CREATE INDEX IF NOT EXISTS idx_image_jobs_user_status_created 
ON public.image_jobs (user_id, status, created_at DESC)
WHERE status IN ('queued', 'processing');