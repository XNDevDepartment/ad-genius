-- Create API keys table for public API access
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['ugc', 'video', 'fashion_catalog'],
  is_active BOOLEAN DEFAULT true,
  rate_limit_tier TEXT DEFAULT 'standard',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create API usage logs table
CREATE TABLE public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  credits_used NUMERIC DEFAULT 0,
  request_metadata JSONB,
  response_time_ms INTEGER,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create API rate limits tracking table
CREATE TABLE public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_type TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  UNIQUE(api_key_id, window_start, window_type)
);

-- Create indexes for performance
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_usage_logs_api_key_id ON public.api_usage_logs(api_key_id);
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX idx_api_rate_limits_api_key_id ON public.api_rate_limits(api_key_id);
CREATE INDEX idx_api_rate_limits_window ON public.api_rate_limits(api_key_id, window_start, window_type);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys"
ON public.api_keys FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
ON public.api_keys FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
ON public.api_keys FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
ON public.api_keys FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for api_usage_logs
CREATE POLICY "Users can view their own API usage logs"
ON public.api_usage_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for api_rate_limits (read-only for users via their keys)
CREATE POLICY "Users can view rate limits for their keys"
ON public.api_rate_limits FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.api_keys
    WHERE api_keys.id = api_rate_limits.api_key_id
    AND api_keys.user_id = auth.uid()
  )
);

-- Function to validate API key (for use by service role in edge functions)
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash TEXT)
RETURNS TABLE (
  api_key_id UUID,
  user_id UUID,
  permissions TEXT[],
  rate_limit_tier TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ak.id as api_key_id,
    ak.user_id,
    ak.permissions,
    ak.rate_limit_tier,
    (ak.is_active = true AND (ak.expires_at IS NULL OR ak.expires_at > now())) as is_valid
  FROM public.api_keys ak
  WHERE ak.key_hash = p_key_hash;
END;
$$;

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_api_key_id UUID,
  p_rate_limit_tier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  minute_count INTEGER;
  hour_count INTEGER;
  day_count INTEGER;
  minute_limit INTEGER;
  hour_limit INTEGER;
  day_limit INTEGER;
  current_minute TIMESTAMPTZ;
  current_hour TIMESTAMPTZ;
  current_day TIMESTAMPTZ;
BEGIN
  -- Set limits based on tier
  CASE p_rate_limit_tier
    WHEN 'free' THEN
      minute_limit := 5;
      hour_limit := 50;
      day_limit := 200;
    WHEN 'starter' THEN
      minute_limit := 20;
      hour_limit := 200;
      day_limit := 2000;
    WHEN 'plus' THEN
      minute_limit := 50;
      hour_limit := 500;
      day_limit := 5000;
    WHEN 'pro' THEN
      minute_limit := 100;
      hour_limit := 1000;
      day_limit := 10000;
    ELSE
      minute_limit := 10;
      hour_limit := 100;
      day_limit := 500;
  END CASE;

  -- Get current window starts
  current_minute := date_trunc('minute', now());
  current_hour := date_trunc('hour', now());
  current_day := date_trunc('day', now());

  -- Get current counts
  SELECT COALESCE(request_count, 0) INTO minute_count
  FROM public.api_rate_limits
  WHERE api_key_id = p_api_key_id AND window_start = current_minute AND window_type = 'minute';

  SELECT COALESCE(request_count, 0) INTO hour_count
  FROM public.api_rate_limits
  WHERE api_key_id = p_api_key_id AND window_start = current_hour AND window_type = 'hour';

  SELECT COALESCE(request_count, 0) INTO day_count
  FROM public.api_rate_limits
  WHERE api_key_id = p_api_key_id AND window_start = current_day AND window_type = 'day';

  -- Check limits
  IF minute_count >= minute_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'minute_limit_exceeded',
      'retry_after', 60 - EXTRACT(SECOND FROM now())::INTEGER,
      'limit', minute_limit
    );
  END IF;

  IF hour_count >= hour_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'hour_limit_exceeded',
      'retry_after', 3600 - EXTRACT(EPOCH FROM (now() - current_hour))::INTEGER,
      'limit', hour_limit
    );
  END IF;

  IF day_count >= day_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'day_limit_exceeded',
      'retry_after', 86400 - EXTRACT(EPOCH FROM (now() - current_day))::INTEGER,
      'limit', day_limit
    );
  END IF;

  -- Increment counters (upsert)
  INSERT INTO public.api_rate_limits (api_key_id, window_start, window_type, request_count)
  VALUES (p_api_key_id, current_minute, 'minute', 1)
  ON CONFLICT (api_key_id, window_start, window_type)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1;

  INSERT INTO public.api_rate_limits (api_key_id, window_start, window_type, request_count)
  VALUES (p_api_key_id, current_hour, 'hour', 1)
  ON CONFLICT (api_key_id, window_start, window_type)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1;

  INSERT INTO public.api_rate_limits (api_key_id, window_start, window_type, request_count)
  VALUES (p_api_key_id, current_day, 'day', 1)
  ON CONFLICT (api_key_id, window_start, window_type)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining_minute', minute_limit - minute_count - 1,
    'remaining_hour', hour_limit - hour_count - 1,
    'remaining_day', day_limit - day_count - 1
  );
END;
$$;

-- Function to log API usage
CREATE OR REPLACE FUNCTION public.log_api_usage(
  p_api_key_id UUID,
  p_user_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER,
  p_credits_used NUMERIC,
  p_request_metadata JSONB,
  p_response_time_ms INTEGER,
  p_ip_address TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.api_usage_logs (
    api_key_id, user_id, endpoint, method, status_code,
    credits_used, request_metadata, response_time_ms, ip_address
  ) VALUES (
    p_api_key_id, p_user_id, p_endpoint, p_method, p_status_code,
    p_credits_used, p_request_metadata, p_response_time_ms, p_ip_address
  ) RETURNING id INTO log_id;

  -- Update last_used_at on the API key
  UPDATE public.api_keys SET last_used_at = now(), updated_at = now()
  WHERE id = p_api_key_id;

  RETURN log_id;
END;
$$;

-- Trigger for updated_at on api_keys
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup old rate limit records (can be run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.api_rate_limits
  WHERE window_start < now() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;