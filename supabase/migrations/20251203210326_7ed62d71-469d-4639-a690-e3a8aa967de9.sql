-- Add privacy settings columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_generation_history boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS analytics_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS public_gallery_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS login_notifications_enabled boolean DEFAULT true;