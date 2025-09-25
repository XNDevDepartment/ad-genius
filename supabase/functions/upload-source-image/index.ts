import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Processing source image upload for user:', user.id);

    // Parse the request body
    const body = await req.json();
    const { base64Image, fileName, fileSize, mimeType } = body;

    if (!base64Image || !fileName) {
      throw new Error('Missing required fields: base64Image and fileName');
    }

    // Convert base64 to Uint8Array
    const base64Data = base64Image.replace(/^data:[^;]+;base64,/, '');
    const imageBuffer = new Uint8Array(
      atob(base64Data)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storagePath = `${user.id}/${uniqueFileName}`;

    console.log('Uploading source image to:', storagePath);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('ugc-inputs')
      .upload(storagePath, imageBuffer, {
        contentType: mimeType || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get the public URL (even though bucket is private, we need the URL structure)
    const { data: { publicUrl } } = supabase.storage
      .from('ugc-inputs')
      .getPublicUrl(storagePath);

    console.log('Source image uploaded successfully, creating database record');

    // Save to database
    const { data: sourceImage, error: dbError } = await supabase
      .from('source_images')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        public_url: publicUrl,
        file_name: fileName,
        file_size: fileSize || imageBuffer.length,
        mime_type: mimeType || 'image/jpeg'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Cleanup uploaded file if database insert fails
      await supabase.storage
        .from('ugc-inputs')
        .remove([storagePath]);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('Source image saved successfully:', sourceImage.id);

    return new Response(
      JSON.stringify({
        success: true,
        sourceImage: {
          id: sourceImage.id,
          publicUrl: sourceImage.public_url,
          fileName: sourceImage.file_name,
          fileSize: sourceImage.file_size,
          mimeType: sourceImage.mime_type,
          createdAt: sourceImage.created_at
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in upload-source-image function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as any)?.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});