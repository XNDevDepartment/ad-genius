import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client } from "https://deno.land/x/s3_lite_client@0.7.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const hetznerAccessKeyId = Deno.env.get('HETZNER_ACCESS_KEY_ID');
const hetznerSecretAccessKey = Deno.env.get('HETZNER_SECRET_ACCESS_KEY');
const hetznerBucketName = Deno.env.get('HETZNER_BUCKET_NAME');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// Debug logging for environment variables
console.log('Environment variables check:');
console.log('HETZNER_ACCESS_KEY_ID:', hetznerAccessKeyId ? 'SET' : 'UNDEFINED');
console.log('HETZNER_SECRET_ACCESS_KEY:', hetznerSecretAccessKey ? 'SET' : 'UNDEFINED');
console.log('HETZNER_BUCKET_NAME:', hetznerBucketName ? `SET (${hetznerBucketName})` : 'UNDEFINED');
console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'UNDEFINED');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'UNDEFINED');

// ✅ certo
const s3Client = new S3Client({
  endPoint: 'nbg1.your-objectstorage.com',  // endpoint global
  useSSL: true,
  region: 'eu-central',                      // string qualquer ok; usa EU
  accessKey: hetznerAccessKeyId!,
  secretKey: hetznerSecretAccessKey!
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Validate required environment variables
    const missingVars = [];
    if (!hetznerAccessKeyId) missingVars.push('HETZNER_ACCESS_KEY_ID');
    if (!hetznerSecretAccessKey) missingVars.push('HETZNER_SECRET_ACCESS_KEY');
    if (!hetznerBucketName) missingVars.push('HETZNER_BUCKET_NAME');
    if (!supabaseUrl) missingVars.push('SUPABASE_URL');
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    if (missingVars.length > 0) {
      const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
      console.error(errorMessage);
      return new Response(JSON.stringify({
        error: errorMessage,
        missingVariables: missingVars
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Starting migration to Hetzner...');
    console.log(`Using bucket: ${hetznerBucketName}`);
    // Get all images from Supabase
    const { data: images, error: fetchError } = await supabase.from('generated_images').select('*').order('created_at', {
      ascending: true
    });
    if (fetchError) {
      throw new Error(`Failed to fetch images: ${fetchError.message}`);
    }
    console.log(`Found ${images?.length || 0} images to migrate`);
    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];
    for (const image of images || []){
      try {
        
        // ✅ skip dinâmico e tolerante a null
        if (image.public_url?.includes(`${hetznerBucketName}.nbg1.your-objectstorage.com`)) {
          console.log(`Skipping already migrated image: ${image.id}`);
          continue;
        }
        console.log(`Migrating image ${image.id}...`);
        // Download image from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage.from('generated-images').download(image.storage_path);
        if (downloadError) {
          console.error(`Failed to download ${image.id}:`, downloadError);
          errors.push({
            id: image.id,
            error: downloadError.message
          });
          errorCount++;
          continue;
        }
        // Convert blob to array buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        // Generate new filename maintaining user structure
        const newFileName = `migrated/${image.storage_path}`;

        // Upload to Hetzner
        // ✅ certo (API do s3_lite_client em minúsculas; usa env var)
        await s3Client.putObject({
          bucket: hetznerBucketName!,
          key: newFileName,
          body: uint8Array,
          contentType: 'image/png'   // ideal: detetar pelo ficheiro
          // sem ACL — a policy do bucket trata do público
        });
        
        // ✅ certo (bucket no subdomínio)
        const newPublicUrl =`https://${hetznerBucketName}.nbg1.your-objectstorage.com/${newFileName}`;

        const { error: updateError } = await supabase.from('generated_images').update({
          public_url: newPublicUrl,
          storage_path: newFileName,
          updated_at: new Date().toISOString()
        }).eq('id', image.id);
        if (updateError) {
          console.error(`Failed to update database for ${image.id}:`, updateError);
          errors.push({
            id: image.id,
            error: updateError.message
          });
          errorCount++;
          continue;
        }
        migratedCount++;
        console.log(`Successfully migrated image ${image.id}`);
      } catch (error) {
        console.error(`Error migrating image ${image.id}:`, error);
        errors.push({
          id: image.id,
          error: error.message
        });
        errorCount++;
      }
    }
    const result = {
      totalImages: images?.length || 0,
      migratedCount,
      errorCount,
      errors: errors.slice(0, 10),
      message: `Migration completed: ${migratedCount} images migrated, ${errorCount} errors`
    };
    console.log('Migration completed:', result);
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in migrate-to-hetzner function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
