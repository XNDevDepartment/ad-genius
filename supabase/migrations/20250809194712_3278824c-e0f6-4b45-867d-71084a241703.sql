-- Create subscribers table to track subscription and credits
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  email TEXT UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT NOT NULL DEFAULT 'Free', -- Free | Pro | Enterprise
  subscription_end TIMESTAMPTZ,
  credits_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and policies
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "select_own_subscriber" ON public.subscribers
  FOR SELECT USING (user_id = auth.uid() OR email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create credits transactions table (ledger)
CREATE TABLE IF NOT EXISTS public.credits_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL, -- positive grant, negative spend
  reason TEXT NOT NULL,          -- monthly_grant, generation, manual_adjustment
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_credits_transactions_user_created ON public.credits_transactions (user_id, created_at DESC);

-- Enable RLS and policies
ALTER TABLE public.credits_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "select_own_credits_transactions" ON public.credits_transactions
  FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
