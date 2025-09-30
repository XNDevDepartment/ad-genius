-- Add niche field to image_jobs table to store user's input niche
ALTER TABLE public.image_jobs 
ADD COLUMN IF NOT EXISTS niche TEXT;

-- Add index for faster lookups when filtering by niche
CREATE INDEX IF NOT EXISTS idx_image_jobs_niche ON public.image_jobs(niche);

-- Add comment for documentation
COMMENT ON COLUMN public.image_jobs.niche IS 'The niche/target audience that the user specified for UGC generation';