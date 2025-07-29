-- Create image_favorites table for users to favorite generated images
CREATE TABLE public.image_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_id UUID NOT NULL REFERENCES generated_images(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, image_id)
);

-- Enable Row Level Security
ALTER TABLE public.image_favorites ENABLE ROW LEVEL SECURITY;

-- Users can create their own favorites
CREATE POLICY "Users can create their own favorites" 
ON public.image_favorites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites" 
ON public.image_favorites 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites" 
ON public.image_favorites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can view all favorites
CREATE POLICY "Admins can view all favorites" 
ON public.image_favorites 
FOR SELECT 
USING (is_admin());