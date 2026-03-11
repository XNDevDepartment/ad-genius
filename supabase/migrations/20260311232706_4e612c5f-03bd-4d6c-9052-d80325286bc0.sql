-- Shopify store connection status enum
CREATE TYPE public.shopify_connection_status AS ENUM (
  'disconnected', 'pending', 'connected', 'verified', 'error', 'revoked'
);

-- Dedicated Shopify store connections table
CREATE TABLE public.shopify_store_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'shopify',
  shop_domain TEXT NOT NULL,
  shop_name TEXT,
  shopify_store_id TEXT,
  connection_id TEXT NOT NULL,
  connection_source TEXT DEFAULT 'shopify_app',
  connection_status public.shopify_connection_status NOT NULL DEFAULT 'pending',
  is_connected BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  webhook_secret TEXT,
  metadata JSONB DEFAULT '{}',
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  connected_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  UNIQUE (user_id, shop_domain),
  UNIQUE (connection_id)
);

CREATE INDEX idx_shopify_connections_user_id ON public.shopify_store_connections(user_id);
CREATE INDEX idx_shopify_connections_shop_domain ON public.shopify_store_connections(shop_domain);
CREATE INDEX idx_shopify_connections_status ON public.shopify_store_connections(connection_status);

ALTER TABLE public.shopify_store_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shopify connections"
  ON public.shopify_store_connections FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own shopify connections"
  ON public.shopify_store_connections FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own shopify connections"
  ON public.shopify_store_connections FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own shopify connections"
  ON public.shopify_store_connections FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access shopify connections"
  ON public.shopify_store_connections FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_shopify_connections_updated_at
  BEFORE UPDATE ON public.shopify_store_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log
CREATE TABLE public.shopify_connection_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES public.shopify_store_connections(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_status public.shopify_connection_status,
  new_status public.shopify_connection_status,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shopify_connection_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shopify audit logs"
  ON public.shopify_connection_audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access shopify audit"
  ON public.shopify_connection_audit_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_shopify_audit_connection ON public.shopify_connection_audit_log(connection_id);
CREATE INDEX idx_shopify_audit_user ON public.shopify_connection_audit_log(user_id);

-- Add shopify_connection_id to job tables for linking
ALTER TABLE public.image_jobs ADD COLUMN shopify_connection_id UUID REFERENCES public.shopify_store_connections(id) ON DELETE SET NULL;
ALTER TABLE public.kling_jobs ADD COLUMN shopify_connection_id UUID REFERENCES public.shopify_store_connections(id) ON DELETE SET NULL;
ALTER TABLE public.outfit_swap_jobs ADD COLUMN shopify_connection_id UUID REFERENCES public.shopify_store_connections(id) ON DELETE SET NULL;
ALTER TABLE public.bulk_background_jobs ADD COLUMN shopify_connection_id UUID REFERENCES public.shopify_store_connections(id) ON DELETE SET NULL;