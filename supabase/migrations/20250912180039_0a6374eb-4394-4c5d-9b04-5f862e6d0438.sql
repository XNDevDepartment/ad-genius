-- Enable realtime for ugc_images table only (image_jobs already enabled)
ALTER TABLE public.ugc_images REPLICA IDENTITY FULL;

-- Add ugc_images to realtime publication  
ALTER PUBLICATION supabase_realtime ADD TABLE public.ugc_images;