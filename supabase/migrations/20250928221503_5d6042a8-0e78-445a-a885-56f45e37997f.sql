-- Make ugc-inputs bucket public so images can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'ugc-inputs';

-- Create RLS policy to allow users to see their own uploaded files
CREATE POLICY "Users can view their own ugc input files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'ugc-inputs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);