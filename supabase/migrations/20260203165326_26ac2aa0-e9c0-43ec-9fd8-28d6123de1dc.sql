-- Create bulk_background_jobs table
CREATE TABLE public.bulk_background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'canceled')),
  
  -- Background configuration
  background_type TEXT NOT NULL CHECK (background_type IN ('preset', 'custom')),
  background_preset_id TEXT,
  background_image_url TEXT,
  
  -- Progress tracking
  total_images INTEGER NOT NULL DEFAULT 0,
  completed_images INTEGER NOT NULL DEFAULT 0,
  failed_images INTEGER NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  settings JSONB DEFAULT '{}',
  error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Create bulk_background_results table
CREATE TABLE public.bulk_background_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.bulk_background_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Source image reference
  source_image_id UUID,
  source_image_url TEXT NOT NULL,
  
  -- Result
  result_url TEXT,
  storage_path TEXT,
  
  -- Status per image
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error TEXT,
  
  -- Metadata
  image_index INTEGER NOT NULL,
  processing_time_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.bulk_background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_background_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bulk_background_jobs
CREATE POLICY "Users can view own bulk bg jobs" ON public.bulk_background_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bulk bg jobs" ON public.bulk_background_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bulk bg jobs" ON public.bulk_background_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bulk bg jobs" ON public.bulk_background_jobs
  FOR SELECT USING (is_admin());

CREATE POLICY "Service role full access bulk bg jobs" ON public.bulk_background_jobs
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for bulk_background_results
CREATE POLICY "Users can view own bulk bg results" ON public.bulk_background_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bulk bg results" ON public.bulk_background_results
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bulk bg results" ON public.bulk_background_results
  FOR SELECT USING (is_admin());

CREATE POLICY "Service role full access bulk bg results" ON public.bulk_background_results
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_bulk_bg_jobs_user ON public.bulk_background_jobs(user_id);
CREATE INDEX idx_bulk_bg_jobs_status ON public.bulk_background_jobs(status);
CREATE INDEX idx_bulk_bg_results_job ON public.bulk_background_results(job_id);
CREATE INDEX idx_bulk_bg_results_user ON public.bulk_background_results(user_id);

-- Updated_at triggers
CREATE TRIGGER update_bulk_bg_jobs_updated_at
  BEFORE UPDATE ON public.bulk_background_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bulk_bg_results_updated_at
  BEFORE UPDATE ON public.bulk_background_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();