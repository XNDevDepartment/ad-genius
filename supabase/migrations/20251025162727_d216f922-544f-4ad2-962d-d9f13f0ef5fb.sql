-- Fix outfit_swap_jobs schema to support both source images and base models
-- Make source_person_id nullable since batch jobs use base_model_id instead
ALTER TABLE outfit_swap_jobs 
  ALTER COLUMN source_person_id DROP NOT NULL;

-- Add check constraint to ensure at least one person source is specified
ALTER TABLE outfit_swap_jobs
  ADD CONSTRAINT outfit_swap_jobs_person_source_check 
  CHECK (source_person_id IS NOT NULL OR base_model_id IS NOT NULL);

-- Enable realtime for all outfit swap tables (only if not already set)
DO $$ 
BEGIN
  ALTER TABLE outfit_swap_jobs REPLICA IDENTITY FULL;
  ALTER TABLE outfit_swap_batches REPLICA IDENTITY FULL;
  ALTER TABLE outfit_swap_results REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;