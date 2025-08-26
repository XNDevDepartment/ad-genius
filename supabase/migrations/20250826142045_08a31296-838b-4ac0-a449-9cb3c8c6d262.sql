
-- 1) Add job_id to generated_images and link to image_jobs
ALTER TABLE public.generated_images
ADD COLUMN IF NOT EXISTS job_id uuid;

ALTER TABLE public.generated_images
ADD CONSTRAINT generated_images_job_id_fkey
FOREIGN KEY (job_id) REFERENCES public.image_jobs(id) ON DELETE SET NULL;

-- 2) Updated-at triggers (function already exists as public.update_updated_at_column)

-- For image_jobs
DROP TRIGGER IF EXISTS set_image_jobs_updated_at ON public.image_jobs;
CREATE TRIGGER set_image_jobs_updated_at
BEFORE UPDATE ON public.image_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- For generated_images
DROP TRIGGER IF EXISTS set_generated_images_updated_at ON public.generated_images;
CREATE TRIGGER set_generated_images_updated_at
BEFORE UPDATE ON public.generated_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Idempotency and performance indexes

-- Enforce idempotency on (user_id, content_hash)
-- Note: content_hash is NOT NULL by schema; if not, ensure it is populated by the edge function.
CREATE UNIQUE INDEX IF NOT EXISTS idx_image_jobs_user_content_hash_unique
ON public.image_jobs (user_id, content_hash);

-- Common filters and ordering
CREATE INDEX IF NOT EXISTS idx_image_jobs_user_created_at
ON public.image_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_jobs_status
ON public.image_jobs (status);

CREATE INDEX IF NOT EXISTS idx_generated_images_user_created_at
ON public.generated_images (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_images_job_id
ON public.generated_images (job_id);

CREATE INDEX IF NOT EXISTS idx_generated_images_source_image_id
ON public.generated_images (source_image_id);
