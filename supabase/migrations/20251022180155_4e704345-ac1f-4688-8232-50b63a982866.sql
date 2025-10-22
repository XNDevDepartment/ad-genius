-- Retroactively credit Founders users who received less than 80 credits
-- This corrects the issue where Founders plan purchases didn't allocate credits properly

DO $$
DECLARE
  affected_user RECORD;
  credits_to_add NUMERIC;
  result JSONB;
BEGIN
  -- Find Founders users with less than 80 credits
  FOR affected_user IN 
    SELECT user_id, credits_balance, subscription_tier, email
    FROM subscribers
    WHERE subscription_tier = 'Founders'
    AND credits_balance < 80
    AND subscribed = true
  LOOP
    -- Calculate how many credits to add to reach 80
    credits_to_add := 80 - affected_user.credits_balance;
    
    -- Add the missing credits
    SELECT refund_user_credits(
      affected_user.user_id,
      credits_to_add,
      'founders_subscription_retroactive_correction'
    ) INTO result;
    
    RAISE NOTICE 'Credited user % (%) with % credits. Result: %', 
      affected_user.email, 
      affected_user.user_id, 
      credits_to_add,
      result;
  END LOOP;
  
  RAISE NOTICE 'Founders plan credit correction completed';
END $$;