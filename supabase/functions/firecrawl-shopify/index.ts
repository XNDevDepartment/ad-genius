const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  vendor?: string;
  images: Array<{
    src: string;
    alt?: string;
    width?: number;
    height?: number;
  }>;
  variants?: Array<{
    price?: string;
  }>;
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeUrl, page = 1 } = await req.json();

    if (!storeUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Store URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize the URL
    let normalizedUrl = storeUrl.trim().toLowerCase();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    // Remove trailing slash
    normalizedUrl = normalizedUrl.replace(/\/$/, '');

    console.log('Fetching products from:', normalizedUrl);

    // Try the public products.json endpoint first (fastest method)
    const productsJsonUrl = `${normalizedUrl}/products.json?limit=250&page=${page}`;
    console.log('Trying products.json endpoint:', productsJsonUrl);

    try {
      const directResponse = await fetch(productsJsonUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (directResponse.ok) {
        const data: ShopifyProductsResponse = await directResponse.json();
        console.log(`Found ${data.products?.length || 0} products via direct API`);

        // Normalize the product data
        const products = (data.products || []).map(product => ({
          id: String(product.id),
          title: product.title,
          handle: product.handle,
          vendor: product.vendor,
          price: product.variants?.[0]?.price || null,
          images: (product.images || []).map(img => ({
            src: img.src,
            alt: img.alt || product.title,
            width: img.width,
            height: img.height,
          })),
        }));

        return new Response(
          JSON.stringify({
            success: true,
            products,
            hasMore: products.length === 250,
            page,
            method: 'direct',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Direct API failed, status:', directResponse.status);
    } catch (directError) {
      console.log('Direct API error:', directError);
    }

    // Fall back to Firecrawl scraping
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not access the store. The store may be private or require authentication.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using Firecrawl to scrape products');

    // First, map the store to find product URLs
    const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: normalizedUrl,
        search: 'products',
        limit: 100,
        includeSubdomains: false,
      }),
    });

    if (!mapResponse.ok) {
      const errorData = await mapResponse.json();
      console.error('Firecrawl map error:', errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not scan the store. Please check the URL and try again.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mapData = await mapResponse.json();
    const productUrls = (mapData.links || [])
      .filter((url: string) => url.includes('/products/') && !url.includes('/collections/'))
      .slice(0, 50); // Limit to 50 products for performance

    console.log(`Found ${productUrls.length} product URLs`);

    if (productUrls.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          products: [],
          hasMore: false,
          page: 1,
          method: 'firecrawl',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Scrape product pages with JSON extraction
    const products: Array<{
      id: string;
      title: string;
      handle: string;
      vendor?: string;
      price?: string;
      images: Array<{ src: string; alt?: string }>;
    }> = [];

    // Process in batches of 5
    const batchSize = 5;
    for (let i = 0; i < Math.min(productUrls.length, 25); i += batchSize) {
      const batch = productUrls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url: string) => {
        try {
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url,
              formats: ['markdown', 'links'],
              onlyMainContent: true,
            }),
          });

          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            const handle = url.split('/products/')[1]?.split('?')[0] || '';
            
            // Extract images from the page
            const imageLinks = (scrapeData.data?.links || [])
              .filter((link: string) => 
                link.includes('cdn.shopify.com') && 
                (link.includes('.jpg') || link.includes('.png') || link.includes('.webp'))
              )
              .map((src: string) => ({ src, alt: '' }));

            // Extract title from metadata or markdown
            const title = scrapeData.data?.metadata?.title?.split(' – ')[0]?.split(' | ')[0] || handle;

            if (imageLinks.length > 0) {
              return {
                id: handle,
                title,
                handle,
                vendor: scrapeData.data?.metadata?.author || undefined,
                price: undefined,
                images: imageLinks.slice(0, 10), // Limit images per product
              };
            }
          }
          return null;
        } catch (err) {
          console.error('Error scraping product:', url, err);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      products.push(...batchResults.filter((p): p is NonNullable<typeof p> => p !== null));
    }

    console.log(`Scraped ${products.length} products with images`);

    return new Response(
      JSON.stringify({
        success: true,
        products,
        hasMore: productUrls.length > 25,
        page: 1,
        method: 'firecrawl',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in firecrawl-shopify:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch products';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
