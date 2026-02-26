-- Manually activate marisaisabelnevesribeiro@gmail.com (Plus one-time payment)
-- Webhook was broken and failed to process the payment
UPDATE public.subscribers
SET 
  subscribed = true,
  subscription_end = now() + interval '30 days',
  credits_balance = 200,
  updated_at = now()
WHERE user_id = '73d667fd-1d64-48b0-9e36-cd2d5d7148de';

-- Record the credit transaction
INSERT INTO public.credits_transactions (user_id, amount, reason, metadata)
VALUES (
  '73d667fd-1d64-48b0-9e36-cd2d5d7148de',
  200,
  'manual_fix_webhook_broken',
  '{"note": "Stripe webhook was broken (constructEvent sync error). User paid for Plus one-time but was never activated."}'::jsonb
);