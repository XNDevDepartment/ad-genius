import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client } from "https://deno.land/x/s3_lite_client@0.7.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const hetznerAccessKeyId = Deno.env.get('HETZNER_ACCESS_KEY_ID');
const hetznerSecretAccessKey = Deno.env.get('HETZNER_SECRET_ACCESS_KEY');
const hetznerBucketName = Deno.env.get('HETZNER_BUCKET_NAME');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const s3Client = new S3Client({
  endPoint: 'produktpix.nbg1.your-objectstorage.com',
  useSSL: true,
  region: 'nbg1',
  accessKey: hetznerAccessKeyId!,
  secretKey: hetznerSecretAccessKey!,
});

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { base64Images, prompt, settings, user_id } = await req.json();

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

      // Generate unique filename
      const fileName = `${user_id}/${crypto.randomUUID()}.png`;
      
      // Upload to Hetzner
      await s3Client.putObject({
        Bucket: hetznerBucketName,
        Key: fileName,
        Body: uint8Array,
        ContentType: 'image/png',
        ACL: 'public-read',
      });

      // Construct public URL
      const publicUrl = `https://produktpix.nbg1.your-objectstorage.com/${hetznerBucketName}/${fileName}`;

      // Save metadata to database
      const { data: dbData, error: dbError } = await supabase
        .from('generated_images')
        .insert({
          user_id: user_id,
          storage_path: fileName,
          public_url: publicUrl,
          prompt: prompt,
          settings: settings
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
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
    console.error('Error in hetzner-upload function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});