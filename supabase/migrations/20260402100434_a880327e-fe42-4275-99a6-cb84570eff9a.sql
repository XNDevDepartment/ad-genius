
-- Fix antoniotiago.stessa@gmail.com account (user_id: 4e2840be-26b4-4cc9-a928-229c105037d1)
-- Clear payment_failed_at, set active, grant 90 credits (80 Starter + 10 bonus)
UPDATE public.subscribers
SET 
  payment_failed_at = NULL,
  subscription_status = 'active',
  credits_balance = 90,
  last_reset_at = now(),
  updated_at = now()
WHERE user_id = '4e2840be-26b4-4cc9-a928-229c105037d1';

-- Record the credit transaction
INSERT INTO public.credits_transactions (user_id, amount, reason, metadata)
VALUES (
  '4e2840be-26b4-4cc9-a928-229c105037d1',
  90,
  'manual_credit_adjustment',
  '{"note": "Cancel+resubscribe fix: 80 Starter credits + 10 bonus for inconvenience", "admin_action": true}'::jsonb
);
