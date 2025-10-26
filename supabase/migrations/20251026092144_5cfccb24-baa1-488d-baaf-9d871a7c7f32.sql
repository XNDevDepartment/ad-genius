-- Add age_range column to outfit_swap_base_models
ALTER TABLE outfit_swap_base_models 
ADD COLUMN age_range text;

-- Add generated_image_id reference to outfit_swap_results
ALTER TABLE outfit_swap_results 
ADD COLUMN generated_image_id uuid REFERENCES generated_images(id);