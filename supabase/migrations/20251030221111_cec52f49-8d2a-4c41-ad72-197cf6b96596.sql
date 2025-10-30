-- Create outfit_swap_photoshoots table
CREATE TABLE public.outfit_swap_photoshoots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  result_id UUID NOT NULL REFERENCES public.outfit_swap_results(id) ON DELETE CASCADE,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  
  -- Image URLs
  image_1_url TEXT,
  image_2_url TEXT,
  image_3_url TEXT,
  image_4_url TEXT,
  
  -- Storage paths
  image_1_path TEXT,
  image_2_path TEXT,
  image_3_path TEXT,
  image_4_path TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  
  CONSTRAINT valid_photoshoot_status CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'canceled'))
);

-- Indexes
CREATE INDEX idx_photoshoots_user ON public.outfit_swap_photoshoots(user_id);
CREATE INDEX idx_photoshoots_result ON public.outfit_swap_photoshoots(result_id);
CREATE INDEX idx_photoshoots_status ON public.outfit_swap_photoshoots(status);

-- RLS Policies
ALTER TABLE public.outfit_swap_photoshoots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on photoshoots"
  ON public.outfit_swap_photoshoots FOR ALL 
  USING (public.is_admin());

CREATE POLICY "Service role can manage photoshoots"
  ON public.outfit_swap_photoshoots FOR ALL
  USING (true);

-- Realtime
ALTER TABLE outfit_swap_photoshoots REPLICA IDENTITY FULL;

-- Update trigger
CREATE TRIGGER update_photoshoots_updated_at
  BEFORE UPDATE ON public.outfit_swap_photoshoots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for photoshoot images
INSERT INTO storage.buckets (id, name, public)
VALUES ('outfit-swap-photoshoots', 'outfit-swap-photoshoots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Admins can upload photoshoot images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'outfit-swap-photoshoots' AND public.is_admin());

CREATE POLICY "Anyone can view photoshoot images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'outfit-swap-photoshoots');

CREATE POLICY "Service role can manage photoshoot storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'outfit-swap-photoshoots');