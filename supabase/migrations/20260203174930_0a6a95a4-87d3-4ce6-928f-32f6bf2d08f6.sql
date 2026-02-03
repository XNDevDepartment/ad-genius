-- Create bulk-backgrounds storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bulk-backgrounds', 'bulk-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for bulk-backgrounds bucket
CREATE POLICY "Users can view their own bulk background images"
ON storage.objects FOR SELECT
USING (bucket_id = 'bulk-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own bulk background images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bulk-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role can manage all bulk background images"
ON storage.objects FOR ALL
USING (bucket_id = 'bulk-backgrounds')
WITH CHECK (bucket_id = 'bulk-backgrounds');