-- Add model_type column to image_jobs table to distinguish between OpenAI and Gemini jobs
ALTER TABLE public.image_jobs 
ADD COLUMN model_type TEXT DEFAULT 'openai' CHECK (model_type IN ('openai', 'gemini'));

-- Create index for better query performance
CREATE INDEX idx_image_jobs_model_type ON public.image_jobs(model_type);