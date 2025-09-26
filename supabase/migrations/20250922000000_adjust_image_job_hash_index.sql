-- Allow regenerating identical prompts once previous jobs finish
DROP INDEX IF EXISTS idx_image_jobs_user_content_hash_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_image_jobs_user_content_hash_active_unique
ON public.image_jobs (user_id, content_hash)
WHERE status IN ('queued', 'processing');
