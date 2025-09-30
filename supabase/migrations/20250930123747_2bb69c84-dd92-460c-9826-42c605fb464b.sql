-- Add niche field to image_jobs table to store user's input audience
ALTER TABLE public.image_jobs 
ADD COLUMN IF NOT EXISTS desiredAudience TEXT;
ADD COLUMN IF NOT EXISTS prodSpecs TEXT;

-- Add index for faster lookups when filtering by audience and specs
CREATE INDEX IF NOT EXISTS idx_image_jobs_audience ON public.image_jobs(desiredAudience);

-- Add comment for documentation
COMMENT ON COLUMN public.image_jobs.desiredAudience IS 'The target audience that the user specified for UGC generation';
COMMENT ON COLUMN public.image_jobs.prodSpecs IS 'The products specs that the user specified for UGC generation';