import { supabase } from '@/integrations/supabase/client';

export interface ShopifyProductImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  vendor?: string;
  price?: string | null;
  images: ShopifyProductImage[];
}

export interface FetchProductsResponse {
  success: boolean;
  products?: ShopifyProduct[];
  hasMore?: boolean;
  page?: number;
  method?: string;
  error?: string;
}

export interface ImportResult {
  url: string;
  success: boolean;
  error?: string;
}

export const shopifyImportApi = {
  async fetchProducts(storeUrl: string, page = 1): Promise<FetchProductsResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-shopify', {
      body: { storeUrl, page },
    });

    if (error) {
      console.error('Error fetching Shopify products:', error);
      return { success: false, error: error.message };
    }

    return data;
  },

  async importImage(imageUrl: string): Promise<ImportResult> {
    try {
      const { data, error } = await supabase.functions.invoke('upload-source-image-from-url', {
        body: { imageUrl },
      });

      if (error) {
        return { url: imageUrl, success: false, error: error.message };
      }

      if (!data?.success) {
        return { url: imageUrl, success: false, error: data?.error || 'Upload failed' };
      }

      return { url: imageUrl, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { url: imageUrl, success: false, error: errorMessage };
    }
  },

  async importImages(
    imageUrls: string[], 
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ success: number; failed: number; results: ImportResult[] }> {
    const results: ImportResult[] = [];
    let success = 0;
    let failed = 0;

    // Process in batches of 3 to avoid overwhelming the server
    const batchSize = 3;
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(url => this.importImage(url))
      );

      for (const result of batchResults) {
        results.push(result);
        if (result.success) {
          success++;
        } else {
          failed++;
        }
      }

      onProgress?.(results.length, imageUrls.length);
    }

    return { success, failed, results };
  },
};
