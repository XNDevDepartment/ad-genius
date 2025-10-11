-- Add RLS policies to deny anonymous access to profiles table
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Add RLS policies to deny anonymous access to subscribers table
CREATE POLICY "Deny anonymous access to subscribers"
ON public.subscribers
FOR ALL
TO anon
USING (false);

-- Add user CRUD policies for generated_images table
CREATE POLICY "Users can insert their own images"
ON public.generated_images
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own images"
ON public.generated_images
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
ON public.generated_images
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
ON public.generated_images
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);