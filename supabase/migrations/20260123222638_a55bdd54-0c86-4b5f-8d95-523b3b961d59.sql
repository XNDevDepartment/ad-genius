-- Add milestone tracking columns to onboarding_rewards
ALTER TABLE onboarding_rewards 
ADD COLUMN IF NOT EXISTS ugc_milestone_awarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS video_milestone_awarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS outfit_swap_milestone_awarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS all_complete_awarded BOOLEAN DEFAULT FALSE;

-- Create function to award milestone credits
CREATE OR REPLACE FUNCTION award_milestone_credits(
  p_user_id UUID,
  p_milestone TEXT -- 'ugc', 'video', 'outfit_swap', 'all_complete'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  already_awarded BOOLEAN := FALSE;
  current_record RECORD;
BEGIN
  -- Ensure reward record exists
  INSERT INTO onboarding_rewards (user_id, credits_awarded)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current state
  SELECT ugc_milestone_awarded, video_milestone_awarded, outfit_swap_milestone_awarded, all_complete_awarded
  INTO current_record
  FROM onboarding_rewards
  WHERE user_id = p_user_id;

  -- Check if already awarded based on milestone type
  IF p_milestone = 'ugc' AND current_record.ugc_milestone_awarded IS TRUE THEN
    RETURN FALSE;
  ELSIF p_milestone = 'video' AND current_record.video_milestone_awarded IS TRUE THEN
    RETURN FALSE;
  ELSIF p_milestone = 'outfit_swap' AND current_record.outfit_swap_milestone_awarded IS TRUE THEN
    RETURN FALSE;
  ELSIF p_milestone = 'all_complete' AND current_record.all_complete_awarded IS TRUE THEN
    RETURN FALSE;
  END IF;

  -- Mark milestone as awarded and add credits
  IF p_milestone = 'ugc' THEN
    UPDATE onboarding_rewards 
    SET ugc_milestone_awarded = TRUE, credits_awarded = credits_awarded + 5, updated_at = now() 
    WHERE user_id = p_user_id;
  ELSIF p_milestone = 'video' THEN
    UPDATE onboarding_rewards 
    SET video_milestone_awarded = TRUE, credits_awarded = credits_awarded + 5, updated_at = now() 
    WHERE user_id = p_user_id;
  ELSIF p_milestone = 'outfit_swap' THEN
    UPDATE onboarding_rewards 
    SET outfit_swap_milestone_awarded = TRUE, credits_awarded = credits_awarded + 5, updated_at = now() 
    WHERE user_id = p_user_id;
  ELSIF p_milestone = 'all_complete' THEN
    UPDATE onboarding_rewards 
    SET all_complete_awarded = TRUE, credits_awarded = credits_awarded + 5, updated_at = now() 
    WHERE user_id = p_user_id;
  ELSE
    RETURN FALSE;
  END IF;

  -- Add 5 credits to user's balance
  PERFORM refund_user_credits(p_user_id, 5, 'onboarding_milestone_' || p_milestone);

  RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION award_milestone_credits(UUID, TEXT) TO authenticated;