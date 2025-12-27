-- Drop the existing constraint and add updated one with all skin tone options
ALTER TABLE outfit_swap_base_models 
DROP CONSTRAINT IF EXISTS outfit_swap_base_models_skin_tone_check;

ALTER TABLE outfit_swap_base_models 
ADD CONSTRAINT outfit_swap_base_models_skin_tone_check 
CHECK (skin_tone IS NULL OR skin_tone = ANY (ARRAY['light', 'medium', 'tan', 'dark', 'very-fair', 'fair', 'olive', 'brown', 'dark-brown']));