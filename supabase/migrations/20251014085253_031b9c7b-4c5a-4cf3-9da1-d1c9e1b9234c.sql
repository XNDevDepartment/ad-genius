-- Add DELETE policy for ugc_images so users can delete their own images
CREATE POLICY "Users can delete their own UGC images"
ON public.ugc_images
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);