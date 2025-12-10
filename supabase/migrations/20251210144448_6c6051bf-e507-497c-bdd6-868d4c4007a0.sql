-- Add subscription_status column to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscribers_subscription_status_check'
  ) THEN
    ALTER TABLE public.subscribers 
    ADD CONSTRAINT subscribers_subscription_status_check 
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'incomplete'));
  END IF;
END $$;

-- Create dunning_notifications table to track sent reminders
CREATE TABLE IF NOT EXISTS public.dunning_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT dunning_notifications_type_check CHECK (notification_type IN ('day_0', 'day_7', 'day_18', 'downgrade')),
  CONSTRAINT dunning_notifications_unique UNIQUE(user_id, notification_type)
);

-- Enable RLS on dunning_notifications
ALTER TABLE public.dunning_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for dunning_notifications
CREATE POLICY "Service role can manage dunning notifications"
ON public.dunning_notifications FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view dunning notifications"
ON public.dunning_notifications FOR SELECT
USING (is_admin());

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_dunning_notifications_user_id ON public.dunning_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_payment_failed_at ON public.subscribers(payment_failed_at) WHERE payment_failed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscribers_subscription_status ON public.subscribers(subscription_status);