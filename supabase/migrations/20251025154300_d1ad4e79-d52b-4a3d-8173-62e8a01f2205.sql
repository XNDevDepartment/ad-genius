-- Create outfit_swap_base_models table
CREATE TABLE public.outfit_swap_base_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'unisex')),
  body_type TEXT CHECK (body_type IN ('slim', 'athletic', 'average', 'plus')),
  pose_type TEXT CHECK (pose_type IN ('front', 'side', 'back', 'angled')),
  skin_tone TEXT CHECK (skin_tone IN ('light', 'medium', 'tan', 'dark')),
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT true,
  user_id UUID,
  display_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_base_models_active ON public.outfit_swap_base_models(is_active) WHERE is_active = true;
CREATE INDEX idx_base_models_user ON public.outfit_swap_base_models(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_base_models_system ON public.outfit_swap_base_models(is_system) WHERE is_system = true;

-- RLS Policies for base models
ALTER TABLE public.outfit_swap_base_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active system base models"
  ON public.outfit_swap_base_models FOR SELECT
  USING (is_active = true AND is_system = true);

CREATE POLICY "Users can view own base models"
  ON public.outfit_swap_base_models FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins full access to base models"
  ON public.outfit_swap_base_models FOR ALL
  USING (is_admin());

CREATE POLICY "Premium users can upload base models"
  ON public.outfit_swap_base_models FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.subscribers 
      WHERE user_id = auth.uid() 
      AND subscription_tier IN ('Starter', 'Plus', 'Pro', 'Founders')
      AND subscribed = true
    )
  );

-- Add batch support to outfit_swap_jobs
ALTER TABLE public.outfit_swap_jobs 
  ADD COLUMN batch_id UUID,
  ADD COLUMN base_model_id UUID REFERENCES public.outfit_swap_base_models(id),
  ADD COLUMN garment_ids JSONB DEFAULT '[]',
  ADD COLUMN total_garments INTEGER DEFAULT 1,
  ADD COLUMN completed_garments INTEGER DEFAULT 0;

CREATE INDEX idx_outfit_jobs_batch ON public.outfit_swap_jobs(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_outfit_jobs_base_model ON public.outfit_swap_jobs(base_model_id);

-- Create batches tracking table
CREATE TABLE public.outfit_swap_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  base_model_id UUID NOT NULL REFERENCES public.outfit_swap_base_models(id),
  total_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  failed_jobs INTEGER DEFAULT 0,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'canceled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_batches_user ON public.outfit_swap_batches(user_id);
CREATE INDEX idx_batches_status ON public.outfit_swap_batches(status);

-- RLS for batches
ALTER TABLE public.outfit_swap_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batches"
  ON public.outfit_swap_batches FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all batches"
  ON public.outfit_swap_batches FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role can manage batches"
  ON public.outfit_swap_batches FOR ALL
  USING (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('outfit-base-models', 'outfit-base-models', true);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('outfit-user-models', 'outfit-user-models', true);

-- RLS for outfit-base-models bucket
CREATE POLICY "Admins can upload base models"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'outfit-base-models' 
    AND is_admin()
  );

CREATE POLICY "Anyone can view base models"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'outfit-base-models');

CREATE POLICY "Admins can update base models"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'outfit-base-models' AND is_admin());

CREATE POLICY "Admins can delete base models"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'outfit-base-models' AND is_admin());

-- RLS for outfit-user-models bucket
CREATE POLICY "Premium users can upload their models"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'outfit-user-models'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.subscribers 
      WHERE user_id = auth.uid() 
      AND subscription_tier IN ('Starter', 'Plus', 'Pro', 'Founders')
      AND subscribed = true
    )
  );

CREATE POLICY "Users can view their uploaded models"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'outfit-user-models'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their uploaded models"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'outfit-user-models'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Trigger for updating updated_at
CREATE TRIGGER update_base_models_updated_at
  BEFORE UPDATE ON public.outfit_swap_base_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON public.outfit_swap_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();