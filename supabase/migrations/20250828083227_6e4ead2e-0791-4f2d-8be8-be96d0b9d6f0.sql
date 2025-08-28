
-- Create image_jobs table for job tracking
CREATE TABLE IF NOT EXISTS public.image_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'canceled')),
  progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total INT NOT NULL DEFAULT 1 CHECK (total > 0),
  completed INT NOT NULL DEFAULT 0 CHECK (completed >= 0),
  failed INT NOT NULL DEFAULT 0 CHECK (failed >= 0),
  prompt TEXT NOT NULL,
  settings JSONB NOT NULL,
  source_image_id UUID REFERENCES public.source_images(id),
  idempotency_key TEXT UNIQUE,
  reserved_credits NUMERIC NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Create ugc_images table for job outputs
CREATE TABLE IF NOT EXISTS public.ugc_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.image_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  prompt TEXT NULL,
  public_showcase BOOLEAN NULL,
  source_image_id UUID NULL DEFAULT GEN_RANDOM_UUID(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
);

create table public.ugc_images (
  id uuid not null default gen_random_uuid (),
  job_id uuid not null,
  user_id uuid not null,
  storage_path text not null,
  public_url text not null,
  meta jsonb null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  prompt text null,
  public_showcase boolean null,
  source_image_id uuid null default gen_random_uuid (),
  updated_at timestamp with time zone null,
  constraint ugc_images_pkey primary key (id),
  constraint ugc_images_job_id_fkey foreign KEY (job_id) references image_jobs (id) on delete CASCADE,
  constraint ugc_images_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Add RLS policies for image_jobs
ALTER TABLE public.image_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs" 
ON public.image_jobs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" 
ON public.image_jobs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
ON public.image_jobs FOR UPDATE 
USING (auth.uid() = user_id);

-- Add RLS policies for ugc_images
ALTER TABLE public.ugc_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ugc images" 
ON public.ugc_images FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all ugc images" 
ON public.ugc_images FOR ALL 
USING (true);

-- Enable realtime on image_jobs
ALTER TABLE public.image_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.image_jobs;

-- Create ugc storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ugc', 'ugc', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies for ugc bucket
CREATE POLICY "Users can read their own ugc files"
ON storage.objects FOR SELECT
USING (bucket_id = 'ugc' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role can manage ugc files"
ON storage.objects FOR ALL
USING (bucket_id = 'ugc');

-- Create function to calculate image generation cost
CREATE OR REPLACE FUNCTION public.calculate_image_cost(
  p_settings JSONB
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base_cost NUMERIC := 1;
  quality_multiplier NUMERIC := 1;
  size_multiplier NUMERIC := 1;
  number_of_images INT := 1;
BEGIN
  -- Extract settings
  number_of_images := COALESCE((p_settings->>'number')::INT, 1);
  
  -- Quality multiplier
  CASE COALESCE(p_settings->>'quality', 'standard')
    WHEN 'hd' THEN quality_multiplier := 2;
    ELSE quality_multiplier := 1;
  END CASE;
  
  -- Size multiplier (larger images cost more)
  CASE COALESCE(p_settings->>'size', '1024x1024')
    WHEN '1536x1024', '1024x1536' THEN size_multiplier := 1.5;
    ELSE size_multiplier := 1;
  END CASE;
  
  RETURN number_of_images * base_cost * quality_multiplier * size_multiplier;
END;
$$;

-- Create function to generate idempotency key
CREATE OR REPLACE FUNCTION public.generate_idempotency_key(
  p_user_id UUID,
  p_source_image_id UUID,
  p_prompt TEXT,
  p_settings JSONB
) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  content_string TEXT;
BEGIN
  content_string := p_user_id::TEXT || 
    COALESCE(p_source_image_id::TEXT, '') || 
    p_prompt || 
    p_settings::TEXT;
  
  RETURN encode(digest(content_string, 'sha256'), 'hex');
END;
$$;
