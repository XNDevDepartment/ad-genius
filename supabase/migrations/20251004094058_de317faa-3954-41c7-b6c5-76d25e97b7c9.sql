-- Phase 1: Kling AI Video Generation - Database & Storage Infrastructure (Idempotent)

-- ============================================================================
-- 1. Create kling_jobs table (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.kling_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job configuration
  model TEXT NOT NULL DEFAULT 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
  prompt TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 10 CHECK (duration IN (5, 10)),
  
  -- Source image references (nullable - either ugc or source image)
  source_image_id UUID REFERENCES public.source_images(id) ON DELETE SET NULL,
  ugc_image_id UUID REFERENCES public.ugc_images(id) ON DELETE SET NULL,
  image_path TEXT,
  image_url TEXT,
  
  -- Job tracking
  request_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'succeeded', 'error')),
  
  -- Results
  video_path TEXT,
  video_url TEXT,
  video_duration NUMERIC,
  video_size_bytes BIGINT,
  
  -- Error handling
  error JSONB,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  
  -- Ensure at least one image reference exists
  CONSTRAINT check_image_reference CHECK (
    source_image_id IS NOT NULL OR 
    ugc_image_id IS NOT NULL OR 
    image_url IS NOT NULL
  )
);

-- ============================================================================
-- 2. Create indexes for performance (drop first if exists)
-- ============================================================================
DROP INDEX IF EXISTS public.idx_kling_jobs_user_id;
DROP INDEX IF EXISTS public.idx_kling_jobs_status;
DROP INDEX IF EXISTS public.idx_kling_jobs_request_id;
DROP INDEX IF EXISTS public.idx_kling_jobs_created_at;

CREATE INDEX idx_kling_jobs_user_id ON public.kling_jobs(user_id);
CREATE INDEX idx_kling_jobs_status ON public.kling_jobs(status);
CREATE INDEX idx_kling_jobs_request_id ON public.kling_jobs(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_kling_jobs_created_at ON public.kling_jobs(created_at DESC);

-- ============================================================================
-- 3. Add updated_at trigger (drop first if exists)
-- ============================================================================
DROP TRIGGER IF EXISTS trg_kling_jobs_updated ON public.kling_jobs;

CREATE TRIGGER trg_kling_jobs_updated
BEFORE UPDATE ON public.kling_jobs
FOR EACH ROW
EXECUTE PROCEDURE public.kling_jobs_update_timestamp();

-- ============================================================================
-- 4. Enable RLS and create security policies
-- ============================================================================
ALTER TABLE public.kling_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Deny unauthenticated access to kling jobs" ON public.kling_jobs;
DROP POLICY IF EXISTS "Users can view their own kling jobs" ON public.kling_jobs;
DROP POLICY IF EXISTS "Users can create their own kling jobs" ON public.kling_jobs;
DROP POLICY IF EXISTS "Service role can update kling jobs" ON public.kling_jobs;
DROP POLICY IF EXISTS "Admins can view all kling jobs" ON public.kling_jobs;
DROP POLICY IF EXISTS "Admins can update all kling jobs" ON public.kling_jobs;
DROP POLICY IF EXISTS "Admins can delete kling jobs" ON public.kling_jobs;

-- Create policies
CREATE POLICY "Deny unauthenticated access to kling jobs"
ON public.kling_jobs FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "Users can view their own kling jobs"
ON public.kling_jobs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own kling jobs"
ON public.kling_jobs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update kling jobs"
ON public.kling_jobs FOR UPDATE
USING (true);

CREATE POLICY "Admins can view all kling jobs"
ON public.kling_jobs FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can update all kling jobs"
ON public.kling_jobs FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete kling jobs"
ON public.kling_jobs FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- 5. Create videos storage bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/webm'];

-- ============================================================================
-- 6. Add RLS policies for videos storage bucket
-- ============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can upload videos to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload videos" ON storage.objects;

-- Create policies
CREATE POLICY "Users can upload videos to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'videos' 
  AND (storage.foldername(name))[1] = 'kling'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'videos' 
  AND (storage.foldername(name))[1] = 'kling'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Service role can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] = 'kling'
);

-- ============================================================================
-- 7. Create helper functions
-- ============================================================================

-- Function to calculate video generation cost
CREATE OR REPLACE FUNCTION public.get_video_credit_cost(
  p_duration INTEGER DEFAULT 10,
  p_quality TEXT DEFAULT 'standard'
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  base_cost NUMERIC := 5;
  duration_multiplier NUMERIC;
BEGIN
  duration_multiplier := CASE
    WHEN p_duration <= 5 THEN 1
    ELSE 2
  END;
  
  RETURN base_cost * duration_multiplier;
END;
$$;

COMMENT ON FUNCTION public.get_video_credit_cost IS 'Calculate credit cost for video generation. 5s = 5 credits, 10s = 10 credits';

-- Function to check if user can afford video generation
CREATE OR REPLACE FUNCTION public.can_afford_video(
  p_user_id UUID,
  p_duration INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_balance NUMERIC;
  required_credits NUMERIC;
BEGIN
  SELECT credits_balance INTO current_balance
  FROM public.subscribers
  WHERE user_id = p_user_id;
  
  IF current_balance IS NULL THEN
    RETURN false;
  END IF;
  
  required_credits := public.get_video_credit_cost(p_duration);
  
  RETURN current_balance >= required_credits;
END;
$$;