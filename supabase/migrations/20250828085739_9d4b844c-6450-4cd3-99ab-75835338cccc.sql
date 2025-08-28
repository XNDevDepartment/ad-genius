-- Add missing columns to image_jobs table to match JobRow type
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS total INTEGER DEFAULT 1;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS completed INTEGER DEFAULT 0;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS failed INTEGER DEFAULT 0;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE;

-- Ensure image_jobs has proper realtime replication
ALTER TABLE public.image_jobs REPLICA IDENTITY FULL;

-- Add the table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.image_jobs;

-- Update ugc_images table to ensure it matches UgcImageRow type and has proper RLS
ALTER TABLE public.ugc_images REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ugc_images;