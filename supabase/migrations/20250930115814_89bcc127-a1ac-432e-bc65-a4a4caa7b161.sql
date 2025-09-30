-- Add source_image_ids array to image_jobs table for multiple source image support
ALTER TABLE public.image_jobs 
ADD COLUMN IF NOT EXISTS source_image_ids JSONB DEFAULT '[]'::jsonb;

-- Add index for faster queries on source_image_ids
CREATE INDEX IF NOT EXISTS idx_image_jobs_source_image_ids ON public.image_jobs USING GIN (source_image_ids);

-- Add comment explaining the column
COMMENT ON COLUMN public.image_jobs.source_image_ids IS 'Array of source image IDs used for this job. Supports multiple source images for Gemini generation.';