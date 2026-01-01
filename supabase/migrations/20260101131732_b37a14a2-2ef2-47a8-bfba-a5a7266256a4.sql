-- Create the source-images bucket for onboarding uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('source-images', 'source-images', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload source images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'source-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own images
CREATE POLICY "Users can view own source images" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'source-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for generated image URLs
CREATE POLICY "Public can view source images" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'source-images');