-- ==========================================
-- Fix 1: Enable realtime for ecommerce photos
-- ==========================================
ALTER TABLE outfit_swap_ecommerce_photos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE outfit_swap_ecommerce_photos;

-- ==========================================
-- Fix 2: Add storage policies for back image uploads
-- ==========================================

-- Allow authenticated users to upload to temp folder
CREATE POLICY "Users can upload temp images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'outfit-user-models' 
  AND (storage.foldername(name))[1] = 'temp'
);

-- Allow users to delete their own temp uploads
CREATE POLICY "Users can delete own temp images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'outfit-user-models' 
  AND (storage.foldername(name))[1] = 'temp'
  AND owner_id = auth.uid()::text
);

-- Allow public read access
CREATE POLICY "Public can read user models"
ON storage.objects
FOR SELECT
USING (bucket_id = 'outfit-user-models');