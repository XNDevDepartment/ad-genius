
-- Restrict sensitive columns on api_keys: hide webhook_secret and key_hash from client SELECT
REVOKE SELECT ON public.api_keys FROM authenticated, anon;
GRANT SELECT (id, user_id, key_prefix, name, permissions, is_active,
              rate_limit_tier, last_used_at, created_at, updated_at,
              expires_at, webhook_url)
  ON public.api_keys TO authenticated;

-- Restrict access_token on shopify_connections from client SELECT
REVOKE SELECT ON public.shopify_connections FROM authenticated, anon;
GRANT SELECT (id, user_id, shop_domain, scopes, connected_at, updated_at)
  ON public.shopify_connections TO authenticated;
