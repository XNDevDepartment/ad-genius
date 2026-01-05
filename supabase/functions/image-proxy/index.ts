const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');
    
    if (!imageUrl) {
      console.error('Missing url parameter');
      return new Response('Missing url parameter', { status: 400, headers: corsHeaders });
    }

    // Only allow Shopify CDN URLs for security
    if (!imageUrl.includes('cdn.shopify.com')) {
      console.error('Invalid URL domain:', imageUrl);
      return new Response('Only Shopify CDN URLs are allowed', { status: 403, headers: corsHeaders });
    }

    console.log('Proxying image:', imageUrl);

    // Fetch the image server-side (bypasses hotlink protection)
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.shopify.com/',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return new Response('Image not found', { status: 404, headers: corsHeaders });
    }

    // Get content type and image data
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageData = await response.arrayBuffer();

    console.log('Successfully proxied image, size:', imageData.byteLength);

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response('Failed to fetch image', { status: 500, headers: corsHeaders });
  }
});
