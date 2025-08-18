import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT token instead of trusting client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    const { base64Images, prompt, settings } = await req.json();

    if (!base64Images || !Array.isArray(base64Images)) {
      throw new Error('base64Images array is required');
    }

    const savedImages = [];

    for (const [index, base64] of base64Images.entries()) {
      // Convert base64 to Uint8Array
      const byteString = atob(base64);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }

      // Generate unique filename using authenticated user ID
      const fileName = `${user.id}/${crypto.randomUUID()}.png`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(fileName, uint8Array, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('generated-images')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Save metadata to database using authenticated user ID
      const { data: dbData, error: dbError } = await supabase
        .from('generated_images')
        .insert({
          user_id: user.id,
          storage_path: fileName,
          public_url: publicUrl,
          prompt: prompt,
          settings: settings
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from('generated-images')
          .remove([fileName]);
        throw new Error(`Failed to save image metadata: ${dbError.message}`);
      }

      savedImages.push({
        id: dbData.id,
        url: publicUrl,
        prompt: dbData.prompt,
        settings: dbData.settings,
        created_at: dbData.created_at,
      });
    }

    return new Response(JSON.stringify({ savedImages }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in supabase-upload function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});