-- Drop all existing policies on generated_images
DROP POLICY IF EXISTS "Admins can view all generated images" ON public.generated_images;
DROP POLICY IF EXISTS "Public showcase images are visible to everyone" ON public.generated_images;
DROP POLICY IF EXISTS "Users can create their own images" ON public.generated_images;
DROP POLICY IF EXISTS "Users can delete their own images" ON public.generated_images;
DROP POLICY IF EXISTS "Users can update their own images" ON public.generated_images;
DROP POLICY IF EXISTS "Users can view their own images" ON public.generated_images;

-- Create simpler, more permissive policies
CREATE POLICY "authenticated_users_full_access"
ON public.generated_images
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow admins full access
CREATE POLICY "admins_full_access"
ON public.generated_images
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Allow public viewing of showcase images
CREATE POLICY "public_showcase_viewable"
ON public.generated_images
FOR SELECT
TO authenticated, anon
USING (public_showcase = true);