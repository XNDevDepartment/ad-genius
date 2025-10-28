-- Create generated_images table
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.image_jobs(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  public_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  source_image_id UUID REFERENCES public.source_images(id) ON DELETE SET NULL,
  public_showcase BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_images
CREATE POLICY "Users can view their own generated images"
ON public.generated_images
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all generated images"
ON public.generated_images
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Public can view showcase images"
ON public.generated_images
FOR SELECT
TO anon
USING (public_showcase = true);

CREATE POLICY "Service role can insert generated images"
ON public.generated_images
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can delete their own generated images"
ON public.generated_images
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create image_favorites table
CREATE TABLE IF NOT EXISTS public.image_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_id UUID NOT NULL REFERENCES public.generated_images(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, image_id)
);

-- Enable RLS
ALTER TABLE public.image_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for image_favorites
CREATE POLICY "Users can view their own favorites"
ON public.image_favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
ON public.image_favorites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.image_favorites
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON public.generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON public.generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_public_showcase ON public.generated_images(public_showcase) WHERE public_showcase = true;
CREATE INDEX IF NOT EXISTS idx_image_favorites_user_id ON public.image_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_image_favorites_image_id ON public.image_favorites(image_id);

-- Add trigger for updated_at
CREATE TRIGGER update_generated_images_updated_at
BEFORE UPDATE ON public.generated_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();