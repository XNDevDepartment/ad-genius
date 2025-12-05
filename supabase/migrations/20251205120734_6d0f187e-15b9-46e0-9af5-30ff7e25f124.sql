-- Fix outfit_swap_ecommerce_photos RLS policies
-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role can manage ecommerce photos" ON public.outfit_swap_ecommerce_photos;

-- Add proper user SELECT policy (users can only view their own records)
DROP POLICY IF EXISTS "Users can view own ecommerce photos" ON public.outfit_swap_ecommerce_photos;
CREATE POLICY "Users can view own ecommerce photos" 
ON public.outfit_swap_ecommerce_photos 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Add user INSERT policy (users can create their own records)
CREATE POLICY "Users can insert own ecommerce photos" 
ON public.outfit_swap_ecommerce_photos 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Add user UPDATE policy (users can update their own records)
CREATE POLICY "Users can update own ecommerce photos" 
ON public.outfit_swap_ecommerce_photos 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

-- Add user DELETE policy (users can delete their own records)
CREATE POLICY "Users can delete own ecommerce photos" 
ON public.outfit_swap_ecommerce_photos 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());