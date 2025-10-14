-- Enable replica identity to capture complete row data during updates
ALTER TABLE public.kling_jobs REPLICA IDENTITY FULL;