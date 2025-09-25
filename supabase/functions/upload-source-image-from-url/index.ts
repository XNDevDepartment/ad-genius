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

    // Fetch the image with proper headers and retry logic
    let imageResponse: Response | undefined;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      try {
        imageResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
        break;
      } catch (error) {
        retryCount++;
        console.error(`Fetch attempt ${retryCount} failed:`, error);
        
        if (retryCount > maxRetries) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to fetch image after ${maxRetries} attempts: ${(error as any)?.message || String(error)}` 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
    
    // Check if we have a response after all retries
    if (!imageResponse) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to get response from image URL after all retries' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Image fetch response:', {
      status: imageResponse.status,
      statusText: imageResponse.statusText,
      headers: Object.fromEntries(imageResponse.headers.entries()),
    });
    
    if (!imageResponse.ok) {
      console.error('Failed to fetch image:', {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        url: imageUrl
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch image from URL (${imageResponse.status}: ${imageResponse.statusText})` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const contentType = imageResponse.headers.get('content-type');
    console.log('Content-Type received:', contentType);
    
    // More flexible content-type validation
    const isValidImage = contentType && (
      contentType.startsWith('image/') || 
      contentType.includes('image') ||
      // Some servers might return generic content types for images
      contentType === 'application/octet-stream'
    );
    
    if (!isValidImage) {
      console.error('Invalid content type:', contentType);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `URL does not point to a valid image (Content-Type: ${contentType})` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get image buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    const fileSize = imageBuffer.byteLength;
    
    console.log('Image file size:', {
      bytes: fileSize,
      mb: (fileSize / (1024 * 1024)).toFixed(2),
      url: imageUrl
    });

    // Check file size limit (20MB for high-resolution images)
    const maxFileSize = 20 * 1024 * 1024; // 20MB
    if (fileSize > maxFileSize) {
      console.error('File size exceeds limit:', {
        fileSize,
        maxFileSize,
        fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2)
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Image file size (${(fileSize / (1024 * 1024)).toFixed(2)}MB) exceeds 20MB limit` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Determine file extension from content type with more flexibility
    const extensionMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/tiff': 'tiff',
      'image/bmp': 'bmp',
      'application/octet-stream': 'jpg', // fallback for generic content-type
    };
    
    let extension = extensionMap[contentType];
    
    // If no direct match, try to extract from URL or default to jpg
    if (!extension) {
      const urlExtension = imageUrl.split('.').pop()?.toLowerCase().split('?')[0];
      extension = urlExtension && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'tiff', 'bmp'].includes(urlExtension) 
        ? (urlExtension === 'jpeg' ? 'jpg' : urlExtension)
        : 'jpg';
    }
    
    console.log('File extension determined:', { contentType, extension, url: imageUrl });
    
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
      console.error('Storage upload error:', {
        error: storageError,
        storagePath,
        contentType,
        fileSize,
        bucketName: 'ugc-inputs'
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to upload image to storage: ${storageError.message}` 
        }),
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