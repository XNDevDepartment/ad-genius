-- Add selected_angles column to outfit_swap_photoshoots table
ALTER TABLE public.outfit_swap_photoshoots
ADD COLUMN IF NOT EXISTS selected_angles text[] DEFAULT ARRAY['front', 'three_quarter', 'back', 'side'];

-- Add comment to explain the column
COMMENT ON COLUMN public.outfit_swap_photoshoots.selected_angles IS 'Array of angles to generate: front, three_quarter, back, side, detail';