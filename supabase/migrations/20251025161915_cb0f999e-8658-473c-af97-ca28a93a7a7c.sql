-- Drop old constraint with incorrect values
ALTER TABLE public.outfit_swap_base_models 
  DROP CONSTRAINT IF EXISTS outfit_swap_base_models_pose_type_check;

-- Add new constraint with correct values matching the UI
ALTER TABLE public.outfit_swap_base_models 
  ADD CONSTRAINT outfit_swap_base_models_pose_type_check 
  CHECK (pose_type IN ('standing', 'sitting', 'walking', 'casual', 'formal'));