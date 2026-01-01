-- Add onboarding columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_data jsonb DEFAULT NULL;

-- Create onboarding bonus credits table
CREATE TABLE IF NOT EXISTS public.onboarding_bonus_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  images_used integer NOT NULL DEFAULT 0,
  video_used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_bonus_credits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for onboarding_bonus_credits
CREATE POLICY "Users can view their own onboarding credits"
  ON public.onboarding_bonus_credits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding credits"
  ON public.onboarding_bonus_credits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage onboarding credits"
  ON public.onboarding_bonus_credits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_onboarding_bonus_credits_updated_at
  BEFORE UPDATE ON public.onboarding_bonus_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();