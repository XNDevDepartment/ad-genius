
-- Create product views table
CREATE TABLE public.bulk_background_product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  result_id UUID NOT NULL REFERENCES public.bulk_background_results(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  selected_views TEXT[] NOT NULL DEFAULT '{}',
  macro_url TEXT,
  macro_storage_path TEXT,
  environment_url TEXT,
  environment_storage_path TEXT,
  angle_url TEXT,
  angle_storage_path TEXT,
  metadata JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.bulk_background_product_views ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own product views"
  ON public.bulk_background_product_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own product views"
  ON public.bulk_background_product_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own product views"
  ON public.bulk_background_product_views FOR UPDATE
  USING (auth.uid() = user_id);

-- Update trigger
CREATE TRIGGER update_bulk_background_product_views_updated_at
  BEFORE UPDATE ON public.bulk_background_product_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_background_product_views;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bulk-background-product-views', 'bulk-background-product-views', true);

-- Storage policies
CREATE POLICY "Public read for product views"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bulk-background-product-views');

CREATE POLICY "Auth users can upload product views"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bulk-background-product-views' AND auth.uid()::text = (storage.foldername(name))[1]);
