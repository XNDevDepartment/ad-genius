-- Create outfit_swap_jobs table
CREATE TABLE IF NOT EXISTS public.outfit_swap_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  
  -- Input images
  source_person_id UUID REFERENCES public.source_images(id) ON DELETE CASCADE,
  source_garment_id UUID REFERENCES public.source_images(id) ON DELETE CASCADE,
  
  -- Settings & metadata
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Progress tracking
  progress INTEGER DEFAULT 0,
  error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'canceled'))
);

-- Create indexes for outfit_swap_jobs
CREATE INDEX IF NOT EXISTS idx_outfit_swap_jobs_user_status ON public.outfit_swap_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_outfit_swap_jobs_created ON public.outfit_swap_jobs(created_at DESC);

-- Create outfit_swap_results table
CREATE TABLE IF NOT EXISTS public.outfit_swap_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.outfit_swap_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Storage
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  
  -- Output formats
  jpg_url TEXT,
  png_url TEXT,
  
  -- Metadata (EXIF stripped)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for outfit_swap_results
CREATE INDEX IF NOT EXISTS idx_outfit_swap_results_job ON public.outfit_swap_results(job_id);
CREATE INDEX IF NOT EXISTS idx_outfit_swap_results_user ON public.outfit_swap_results(user_id);

-- Enable RLS on outfit_swap_jobs
ALTER TABLE public.outfit_swap_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for outfit_swap_jobs
CREATE POLICY "Admins can do everything on outfit_swap_jobs"
  ON public.outfit_swap_jobs FOR ALL 
  USING (public.is_admin());

-- Enable RLS on outfit_swap_results
ALTER TABLE public.outfit_swap_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for outfit_swap_results
CREATE POLICY "Admins can view all outfit swap results"
  ON public.outfit_swap_results FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role can insert outfit swap results"
  ON public.outfit_swap_results FOR INSERT
  WITH CHECK (true);

-- Add trigger for updated_at on outfit_swap_jobs
CREATE TRIGGER update_outfit_swap_jobs_updated_at
  BEFORE UPDATE ON public.outfit_swap_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();