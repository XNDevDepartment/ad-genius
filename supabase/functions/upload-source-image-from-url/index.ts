import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const user = userData.user;

    // Parse request body
    const { imageUrl } = await req.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or missing imageUrl' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate URL scheme
    let url: URL;
    try {
      url = new URL(imageUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Fetching image from URL:', imageUrl);

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch image from URL' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const contentType = imageResponse.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL does not point to a valid image' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get image buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    const fileSize = imageBuffer.byteLength;

    // Check file size limit (10MB)
    if (fileSize > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image file size exceeds 10MB limit' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Determine file extension from content type
    const extensionMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    
    const extension = extensionMap[contentType] || 'jpg';
    
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const fileName = `imported-${timestamp}-${random}.${extension}`;
    const storagePath = `${user.id}/${fileName}`;

    console.log('Uploading image to storage:', storagePath);

    // Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('ugc-inputs')
      .upload(storagePath, imageBuffer, {
        contentType: contentType,
        upsert: false
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload image to storage' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('ugc-inputs')
      .getPublicUrl(storagePath);

    if (!publicUrlData?.publicUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate public URL' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Saving source image to database');

    // Save to database
    const { data: dbData, error: dbError } = await supabase
      .from('source_images')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        public_url: publicUrlData.publicUrl,
        file_name: fileName,
        file_size: fileSize,
        mime_type: contentType,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Clean up uploaded file
      await supabase.storage.from('ugc-inputs').remove([storagePath]);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save image metadata' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Source image imported successfully:', dbData.id);

    const sourceImage = {
      id: dbData.id,
      publicUrl: dbData.public_url,
      fileName: dbData.file_name,
      fileSize: dbData.file_size,
      mimeType: dbData.mime_type,
      createdAt: dbData.created_at,
      storage_path: dbData.storage_path,
    };

    return new Response(
      JSON.stringify({ success: true, sourceImage }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});