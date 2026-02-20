import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Query public showcase UGC images
    const { data: images, error: imagesError } = await supabaseClient
      .from('ugc_images')
      .select('id, prompt, public_url, created_at, meta, source_image_id')
      .eq('public_showcase', true)
      .order('created_at', { ascending: false })
      .limit(12);

    if (imagesError) {
      console.error('Error fetching images:', imagesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch images' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get unique source image IDs
    const sourceImageIds = [...new Set(images?.filter(img => img.source_image_id).map(img => img.source_image_id) || [])];
    
    let sourceImagesWithUrls: any[] = [];
    if (sourceImageIds.length > 0) {
      // Get source images
      const { data: sourceImages, error: sourceError } = await supabaseClient
        .from('source_images')
        .select('id, storage_path, public_url')
        .in('id', sourceImageIds);

      if (!sourceError && sourceImages) {
        // Generate signed URLs for source images (7 days TTL for public gallery)
        sourceImagesWithUrls = await Promise.all(
          sourceImages.map(async (source) => {
            const bucket = source.public_url?.includes('/ugc-inputs/') ? 'ugc-inputs' : 'source-images';
            const { data: signedUrlData, error: urlError } = await supabaseClient.storage
              .from(bucket)
              .createSignedUrl(source.storage_path, 604800); // 7 days

            return {
              id: source.id,
              signedUrl: urlError ? null : signedUrlData?.signedUrl
            };
          })
        );
      }
    }

    // Format response with source URLs
    const formattedImages = images?.map(img => {
      const sourceImage = sourceImagesWithUrls.find(src => src.id === img.source_image_id);
      return {
        id: img.id,
        prompt: img.prompt || (img.meta as any)?.prompt || '',
        public_url: img.public_url,
        created_at: img.created_at,
        settings: img.meta || {},
        source_url: sourceImage?.signedUrl || null
      };
    }) || [];

    return new Response(JSON.stringify({ images: formattedImages }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});