-- Create genius_agent_configs table for user settings
CREATE TABLE public.genius_agent_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  audiences JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule_days INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  schedule_hours INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  content_per_run INTEGER NOT NULL DEFAULT 1,
  preferred_style TEXT NOT NULL DEFAULT 'lifestyle',
  highlight_product TEXT NOT NULL DEFAULT 'yes',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create genius_agent_jobs table for tracking generated content
CREATE TABLE public.genius_agent_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  config_id UUID REFERENCES public.genius_agent_configs(id) ON DELETE SET NULL,
  source_image_id UUID REFERENCES public.source_images(id) ON DELETE SET NULL,
  audience TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  image_job_id UUID REFERENCES public.image_jobs(id) ON DELETE SET NULL,
  result_url TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on both tables
ALTER TABLE public.genius_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genius_agent_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for genius_agent_configs
CREATE POLICY "Users can view their own config"
  ON public.genius_agent_configs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own config"
  ON public.genius_agent_configs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own config"
  ON public.genius_agent_configs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all configs"
  ON public.genius_agent_configs
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role full access configs"
  ON public.genius_agent_configs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS policies for genius_agent_jobs
CREATE POLICY "Users can view their own jobs"
  ON public.genius_agent_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all jobs"
  ON public.genius_agent_jobs
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can delete jobs"
  ON public.genius_agent_jobs
  FOR DELETE
  USING (is_admin());

CREATE POLICY "Service role full access jobs"
  ON public.genius_agent_jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_genius_agent_configs_user_id ON public.genius_agent_configs(user_id);
CREATE INDEX idx_genius_agent_configs_active ON public.genius_agent_configs(is_active) WHERE is_active = true;
CREATE INDEX idx_genius_agent_jobs_user_id ON public.genius_agent_jobs(user_id);
CREATE INDEX idx_genius_agent_jobs_status ON public.genius_agent_jobs(status);
CREATE INDEX idx_genius_agent_jobs_created_at ON public.genius_agent_jobs(created_at DESC);

-- Add updated_at trigger for configs
CREATE TRIGGER update_genius_agent_configs_updated_at
  BEFORE UPDATE ON public.genius_agent_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();