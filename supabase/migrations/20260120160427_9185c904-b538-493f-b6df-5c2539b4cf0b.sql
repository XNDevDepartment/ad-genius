-- Add account activation columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_activated BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS activation_token TEXT,
ADD COLUMN IF NOT EXISTS activation_token_expires_at TIMESTAMPTZ;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_activation_token ON public.profiles(activation_token) WHERE activation_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.account_activated IS 'Whether the account has been activated via email. FALSE for new Google OAuth users until they click activation link.';
COMMENT ON COLUMN public.profiles.activation_token IS 'Unique token for email activation link';
COMMENT ON COLUMN public.profiles.activation_token_expires_at IS 'When the activation token expires (7 days from creation)';