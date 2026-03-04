UPDATE public.subscribers 
SET subscription_tier = 'Free',
    subscribed = false,
    subscription_status = 'canceled',
    credits_balance = 10,
    updated_at = now()
WHERE user_id = 'f787f7db-498b-4733-89ee-1d0aa11e2e9a';