-- Create generation_jobs table for background image generation
CREATE TABLE public.generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  prompt TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total_images INTEGER NOT NULL DEFAULT 1,
  generated_images_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for generation_jobs
CREATE POLICY "Users can view their own generation jobs" 
ON public.generation_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generation jobs" 
ON public.generation_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generation jobs" 
ON public.generation_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generation jobs" 
ON public.generation_jobs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can view all generation jobs
CREATE POLICY "Admins can view all generation jobs" 
ON public.generation_jobs 
FOR SELECT 
USING (is_admin());

-- Create index for better performance
CREATE INDEX idx_generation_jobs_user_id ON public.generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_status ON public.generation_jobs(status);
CREATE INDEX idx_generation_jobs_created_at ON public.generation_jobs(created_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_generation_jobs_updated_at
BEFORE UPDATE ON public.generation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create generated_images_jobs junction table to link jobs with generated images
CREATE TABLE public.generated_images_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generation_job_id UUID NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  generated_image_id UUID NOT NULL REFERENCES public.generated_images(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(generation_job_id, generated_image_id)
);

-- Enable RLS for generated_images_jobs
ALTER TABLE public.generated_images_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for generated_images_jobs
CREATE POLICY "Users can view their own generated images jobs" 
ON public.generated_images_jobs 
FOR SELECT 
USING (
  generation_job_id IN (
    SELECT id FROM public.generation_jobs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own generated images jobs" 
ON public.generated_images_jobs 
FOR INSERT 
WITH CHECK (
  generation_job_id IN (
    SELECT id FROM public.generation_jobs WHERE user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX idx_generated_images_jobs_generation_job_id ON public.generated_images_jobs(generation_job_id);
CREATE INDEX idx_generated_images_jobs_generated_image_id ON public.generated_images_jobs(generated_image_id);