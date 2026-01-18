-- Create onboarding_rewards table for tracking bonus credits and first month offer
CREATE TABLE public.onboarding_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  credits_awarded INTEGER DEFAULT 0,
  awarded_at TIMESTAMPTZ,
  first_month_offer_shown BOOLEAN DEFAULT false,
  offer_expires_at TIMESTAMPTZ,
  offer_redeemed BOOLEAN DEFAULT false,
  offer_redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_rewards ENABLE ROW LEVEL SECURITY;

-- Users can only view their own rewards
CREATE POLICY "Users can view own onboarding rewards"
  ON public.onboarding_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own rewards (for initial creation)
CREATE POLICY "Users can insert own onboarding rewards"
  ON public.onboarding_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own rewards
CREATE POLICY "Users can update own onboarding rewards"
  ON public.onboarding_rewards FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to award onboarding credits (20 credits for completing onboarding)
CREATE OR REPLACE FUNCTION public.award_onboarding_credits(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  already_awarded BOOLEAN;
BEGIN
  -- Check if already awarded
  SELECT credits_awarded > 0 INTO already_awarded
  FROM public.onboarding_rewards WHERE user_id = p_user_id;
  
  IF already_awarded IS TRUE THEN
    RETURN FALSE;
  END IF;
  
  -- Insert or update reward record
  INSERT INTO public.onboarding_rewards (user_id, credits_awarded, awarded_at, first_month_offer_shown, offer_expires_at)
  VALUES (p_user_id, 20, now(), true, now() + INTERVAL '48 hours')
  ON CONFLICT (user_id) DO UPDATE SET
    credits_awarded = 20,
    awarded_at = now(),
    first_month_offer_shown = true,
    offer_expires_at = now() + INTERVAL '48 hours',
    updated_at = now();
  
  -- Add credits to user balance using existing function
  PERFORM public.refund_user_credits(p_user_id, 20, 'onboarding_bonus');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user has valid first month offer
CREATE OR REPLACE FUNCTION public.check_first_month_offer(p_user_id UUID)
RETURNS TABLE(is_valid BOOLEAN, expires_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (r.offer_redeemed = false AND r.offer_expires_at > now()) as is_valid,
    r.offer_expires_at
  FROM public.onboarding_rewards r
  WHERE r.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to mark first month offer as redeemed
CREATE OR REPLACE FUNCTION public.redeem_first_month_offer(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.onboarding_rewards
  SET offer_redeemed = true, offer_redeemed_at = now(), updated_at = now()
  WHERE user_id = p_user_id AND offer_redeemed = false AND offer_expires_at > now();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;