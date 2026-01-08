-- Add webhook columns to api_keys table
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Create webhook events table for logging and retry
CREATE TABLE public.api_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL,
  job_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  webhook_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.api_webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own webhook events
CREATE POLICY "Users can view their own webhook events"
ON public.api_webhook_events
FOR SELECT
USING (auth.uid() = user_id);

-- Index for retry processing
CREATE INDEX idx_webhook_events_pending 
ON public.api_webhook_events(status, next_retry_at) 
WHERE status IN ('pending', 'retrying');

-- Index for listing events by api key
CREATE INDEX idx_webhook_events_api_key 
ON public.api_webhook_events(api_key_id, created_at DESC);