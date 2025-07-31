-- Enable real-time updates for generation_jobs table
ALTER TABLE public.generation_jobs REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;