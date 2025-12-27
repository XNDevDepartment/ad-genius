-- Drop the existing constraint and add updated one with all pose types
ALTER TABLE outfit_swap_base_models 
DROP CONSTRAINT IF EXISTS outfit_swap_base_models_pose_type_check;

ALTER TABLE outfit_swap_base_models 
ADD CONSTRAINT outfit_swap_base_models_pose_type_check 
CHECK (pose_type IS NULL OR pose_type = ANY (ARRAY['standing', 'sitting', 'walking', 'casual', 'formal', 'leaning', 'arms-crossed', 'hands-on-hips', 'fashion-runway', 'profile']));