-- Drop the database triggers for MailerLite sync (moving to application-level sync)
DROP TRIGGER IF EXISTS sync_user_to_mailerlite_on_signup ON public.profiles;
DROP TRIGGER IF EXISTS sync_subscription_to_mailerlite_trigger ON public.subscribers;

-- Drop the trigger functions
DROP FUNCTION IF EXISTS public.sync_new_user_to_mailerlite();
DROP FUNCTION IF EXISTS public.sync_subscription_to_mailerlite();