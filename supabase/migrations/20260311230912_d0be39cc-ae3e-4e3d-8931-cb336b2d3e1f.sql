
-- Create shopify_connections table
CREATE TABLE public.shopify_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_domain TEXT NOT NULL,
  access_token TEXT NOT NULL,
  scopes TEXT,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_domain)
);

-- Create shopify_products table
CREATE TABLE public.shopify_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shopify_connection_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE NOT NULL,
  shopify_product_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  vendor TEXT,
  product_type TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, shopify_product_id)
);

-- Enable RLS
ALTER TABLE public.shopify_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for shopify_connections
CREATE POLICY "Users can view their own shopify connections"
  ON public.shopify_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopify connections"
  ON public.shopify_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopify connections"
  ON public.shopify_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopify connections"
  ON public.shopify_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for shopify_products
CREATE POLICY "Users can view their own shopify products"
  ON public.shopify_products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopify products"
  ON public.shopify_products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopify products"
  ON public.shopify_products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopify products"
  ON public.shopify_products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role policies for edge functions
CREATE POLICY "Service role full access shopify_connections"
  ON public.shopify_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access shopify_products"
  ON public.shopify_products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_shopify_connections_updated_at
  BEFORE UPDATE ON public.shopify_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopify_products_updated_at
  BEFORE UPDATE ON public.shopify_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
