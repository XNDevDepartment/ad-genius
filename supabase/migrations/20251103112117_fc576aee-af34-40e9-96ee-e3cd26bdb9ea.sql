-- Add MailerLite tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS mailerlite_subscriber_id TEXT;

-- Create mailerlite sync log table
CREATE TABLE IF NOT EXISTS public.mailerlite_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  mailerlite_subscriber_id TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on sync log
ALTER TABLE public.mailerlite_sync_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view sync logs
CREATE POLICY "Admins can view mailerlite sync logs"
ON public.mailerlite_sync_log
FOR SELECT
USING (is_admin());

-- Create function to sync user to MailerLite on signup
CREATE OR REPLACE FUNCTION public.sync_new_user_to_mailerlite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call edge function asynchronously (non-blocking)
  PERFORM net.http_post(
    url := (SELECT value FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/sync-mailerlite',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY')
    ),
    body := jsonb_build_object(
      'email', NEW.email,
      'name', NEW.name,
      'subscription_tier', 'Free',
      'action', 'subscribe',
      'newsletter_subscribed', COALESCE(NEW.newsletter_subscribed, true)
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'MailerLite sync failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on new user profile creation
DROP TRIGGER IF EXISTS sync_user_to_mailerlite_on_signup ON public.profiles;
CREATE TRIGGER sync_user_to_mailerlite_on_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_new_user_to_mailerlite();

-- Create function to sync subscription changes
CREATE OR REPLACE FUNCTION public.sync_subscription_to_mailerlite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user profile data
  SELECT email, name INTO user_profile
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Only sync if tier changed or subscription status changed
  IF (TG_OP = 'UPDATE' AND (
    OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier OR
    OLD.subscribed IS DISTINCT FROM NEW.subscribed
  )) OR TG_OP = 'INSERT' THEN
    
    -- Call edge function asynchronously
    PERFORM net.http_post(
      url := (SELECT value FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/sync-mailerlite',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY')
      ),
      body := jsonb_build_object(
        'email', user_profile.email,
        'name', user_profile.name,
        'subscription_tier', NEW.subscription_tier,
        'action', 'update',
        'newsletter_subscribed', true
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block subscription update
    RAISE WARNING 'MailerLite sync failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on subscription changes
DROP TRIGGER IF EXISTS sync_subscription_to_mailerlite_trigger ON public.subscribers;
CREATE TRIGGER sync_subscription_to_mailerlite_trigger
AFTER INSERT OR UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION public.sync_subscription_to_mailerlite();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_mailerlite_sync_log_user_id ON public.mailerlite_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_mailerlite_subscriber_id ON public.profiles(mailerlite_subscriber_id);
