-- Drop the existing constraint
ALTER TABLE image_jobs DROP CONSTRAINT IF EXISTS image_jobs_model_type_check;

-- Add the updated constraint with gemini-v3 included
ALTER TABLE image_jobs ADD CONSTRAINT image_jobs_model_type_check 
  CHECK (model_type = ANY (ARRAY['openai'::text, 'gemini'::text, 'gemini-v3'::text]));