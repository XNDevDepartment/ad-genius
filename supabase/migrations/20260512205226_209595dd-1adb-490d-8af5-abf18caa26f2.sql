
CREATE TABLE public.product_swap_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  reference_image_id UUID,
  reference_image_url TEXT NOT NULL,
  new_product_image_id UUID,
  new_product_image_url TEXT NOT NULL,
  audience TEXT NOT NULL,
  scenario TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_image_id UUID,
  result_url TEXT,
  storage_path TEXT,
  credits_spent NUMERIC DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_product_swap_jobs_user_id ON public.product_swap_jobs(user_id);
CREATE INDEX idx_product_swap_jobs_status ON public.product_swap_jobs(status);
CREATE INDEX idx_product_swap_jobs_created_at ON public.product_swap_jobs(created_at DESC);

ALTER TABLE public.product_swap_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own product swap jobs"
ON public.product_swap_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product swap jobs"
ON public.product_swap_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product swap jobs"
ON public.product_swap_jobs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product swap jobs"
ON public.product_swap_jobs FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all product swap jobs"
ON public.product_swap_jobs FOR SELECT
USING (is_admin());

CREATE POLICY "Service role full access product swap jobs"
ON public.product_swap_jobs FOR ALL
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_product_swap_jobs_updated_at
BEFORE UPDATE ON public.product_swap_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
