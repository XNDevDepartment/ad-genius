UPDATE public.subscribers 
SET 
  subscription_tier = 'Starter',
  subscribed = true,
  subscription_status = 'active',
  payment_type = 'subscription',
  updated_at = now()
WHERE user_id = 'abfc3d43-2883-487f-b968-c04eb1354a6a';