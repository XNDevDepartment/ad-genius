
-- Add payment_type column to subscribers
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'subscription';

-- Fix Marisa's record: set to Starter, subscribed, 30 days from 23/02/2026
UPDATE public.subscribers
SET 
  subscription_tier = 'Starter',
  subscribed = true,
  subscription_end = '2026-03-25T00:00:00Z',
  payment_type = 'one_time',
  updated_at = now()
WHERE email = 'marisaisabelnevesribeiro@gmail.com';
