-- Enable realtime for ugc_images table
ALTER TABLE public.ugc_images REPLICA IDENTITY FULL;

-- Add ugc_images to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ugc_images;

-- Ensure image_jobs is also configured for realtime
ALTER TABLE public.image_jobs REPLICA IDENTITY FULL;

-- Add image_jobs to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE public.image_jobs;