-- Create source_images table to store user input images
CREATE TABLE public.source_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.source_images ENABLE ROW LEVEL SECURITY;

-- Create policies for source_images
CREATE POLICY "Users can view their own source images" 
ON public.source_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own source images" 
ON public.source_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own source images" 
ON public.source_images 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own source images" 
ON public.source_images 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all source images" 
ON public.source_images 
FOR SELECT 
USING (is_admin());

-- Add source_image_id column to generated_images table
ALTER TABLE public.generated_images 
ADD COLUMN source_image_id UUID REFERENCES public.source_images(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_generated_images_source_image_id ON public.generated_images(source_image_id);
CREATE INDEX idx_source_images_user_id ON public.source_images(user_id);

-- Create trigger for automatic timestamp updates on source_images
CREATE TRIGGER update_source_images_updated_at
BEFORE UPDATE ON public.source_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create ugc-inputs storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ugc-inputs', 'ugc-inputs', false);

-- Create storage policies for ugc-inputs bucket
CREATE POLICY "Users can view their own input images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ugc-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own input images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'ugc-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own input images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'ugc-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own input images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'ugc-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);