-- Add session_id column to phone_verifications for pre-signup verification
ALTER TABLE public.phone_verifications 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add session_id for linking send/verify requests during signup
ALTER TABLE public.phone_verifications 
  ADD COLUMN IF NOT EXISTS session_id text;

-- Add verification_token for signed tokens
ALTER TABLE public.phone_verifications 
  ADD COLUMN IF NOT EXISTS verification_token text;

-- Create index for session lookups
CREATE INDEX IF NOT EXISTS idx_phone_verifications_session_id 
  ON public.phone_verifications(session_id);

-- Create index for phone number lookups (for rate limiting)
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_number 
  ON public.phone_verifications(phone_number);

-- Add RLS policy for public insert (signup flow)
CREATE POLICY "Allow public insert for signup verification" 
  ON public.phone_verifications 
  FOR INSERT 
  WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);

-- Add RLS policy for public select by session_id
CREATE POLICY "Allow public select by session_id" 
  ON public.phone_verifications 
  FOR SELECT 
  USING (session_id IS NOT NULL);

-- Add RLS policy for public update by session_id
CREATE POLICY "Allow public update by session_id" 
  ON public.phone_verifications 
  FOR UPDATE 
  USING (session_id IS NOT NULL AND user_id IS NULL);