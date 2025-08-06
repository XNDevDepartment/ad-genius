-- Add public showcase capability to generated_images table
ALTER TABLE public.generated_images 
ADD COLUMN public_showcase boolean DEFAULT false;

-- Create index for better performance when querying public images
CREATE INDEX idx_generated_images_public_showcase ON public.generated_images(public_showcase, created_at DESC) WHERE public_showcase = true;

-- Update some existing images to be publicly visible for demo purposes
UPDATE public.generated_images 
SET public_showcase = true 
WHERE id IN (
    SELECT id 
    FROM public.generated_images 
    ORDER BY created_at DESC 
    LIMIT 20
);