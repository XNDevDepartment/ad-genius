import { supabase } from '@/integrations/supabase/client';

export interface ProductViews {
  id: string;
  user_id: string;
  result_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';
  progress: number;
  selected_views: string[];
  macro_url?: string;
  macro_storage_path?: string;
  environment_url?: string;
  environment_storage_path?: string;
  angle_url?: string;
  angle_storage_path?: string;
  metadata?: Record<string, unknown>;
  error?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  finished_at?: string;
}

const ENDPOINT = 'https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/bulk-background';

async function callFunction(action: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const productViewsApi = {
  async create(resultId: string, selectedViews: string[], aspectRatio?: string): Promise<{ productViewsId: string }> {
    return callFunction('createProductViews', { resultId, selectedViews, aspectRatio }) as Promise<{ productViewsId: string }>;
  },

  async get(productViewsId: string): Promise<{ productViews: ProductViews }> {
    return callFunction('getProductViews', { productViewsId }) as Promise<{ productViews: ProductViews }>;
  },

  async getByResult(resultId: string): Promise<{ productViews: ProductViews | null }> {
    return callFunction('getProductViewsByResult', { resultId }) as Promise<{ productViews: ProductViews | null }>;
  },

  subscribeProductViews(productViewsId: string, onUpdate: (pv: ProductViews) => void) {
    const channel = supabase
      .channel(`product-views:${productViewsId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bulk_background_product_views',
        filter: `id=eq.${productViewsId}`,
      }, (payload) => {
        onUpdate(payload.new as ProductViews);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
};
