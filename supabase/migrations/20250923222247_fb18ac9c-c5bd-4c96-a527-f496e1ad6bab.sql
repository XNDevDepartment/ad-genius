-- Correct the credit balance for Founders user who didn't receive their allocation
SELECT refund_user_credits(
  '4a3094d3-7e30-4a20-be54-7305b5a3a28e'::uuid,
  80,
  'founders_subscription_correction'
);