
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

// Generate deterministic content hash for idempotency
function generateContentHash(prompt: string, settings: any, sourceImageId?: string): string {
  const content = JSON.stringify({
    prompt: prompt.trim(),
    settings: {
      size: settings.size,
      quality: settings.quality,
      numberOfImages: settings.numberOfImages,
      format: settings.format || 'png'
    },
    source_image_id: sourceImageId || null
  });
  
  // Simple hash function (in production, consider using crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

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

    const { base64Images, prompt, settings, source_image_id, job_id } = await req.json();

    if (!base64Images || !Array.isArray(base64Images)) {
      throw new Error('base64Images array is required');
    }

    if (!prompt || typeof prompt !== 'string') {
      throw new Error('prompt is required');
    }

    console.log('Processing upload request:', {
      userId: user.id,
      prompt: prompt.substring(0, 50) + '...',
      imageCount: base64Images.length,
      jobId: job_id
    });

    let jobId: string;

    if (job_id) {
      // Use provided job_id and update status to processing
      jobId = job_id;
      await supabase
        .from('image_jobs')
        .update({ 
          status: 'processing',
          error: null 
        })
        .eq('id', jobId)
        .eq('user_id', user.id); // Ensure user owns the job
        
      console.log('Using provided job ID:', jobId);
      
    } else {
      // Legacy behavior: create job using content hash for idempotency
      const contentHash = generateContentHash(prompt, settings, source_image_id);

      // Check for existing job with same content hash
      const { data: existingJob } = await supabase
        .from('image_jobs')
        .select('id, status, created_at')
        .eq('user_id', user.id)
        .eq('content_hash', contentHash)
        .single();

      if (existingJob) {
        console.log('Found existing job:', existingJob.id, 'with status:', existingJob.status);
        
        // If job completed successfully, return existing results
        if (existingJob.status === 'completed') {
          const { data: existingImages } = await supabase
            .from('generated_images')
            .select('id, public_url, prompt, settings, created_at')
            .eq('job_id', existingJob.id)
            .order('created_at', { ascending: true });

          if (existingImages && existingImages.length > 0) {
            console.log('Returning existing completed results for job:', existingJob.id);
            return new Response(JSON.stringify({ 
              savedImages: existingImages.map(img => ({
                id: img.id,
                url: img.public_url,
                prompt: img.prompt,
                settings: img.settings,
                created_at: img.created_at,
              }))
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
        
        jobId = existingJob.id;
        await supabase
          .from('image_jobs')
          .update({ 
            status: 'processing',
            error: null 
          })
          .eq('id', jobId);
          
      } else {
        // Create new job
        const { data: newJob, error: jobError } = await supabase
          .from('image_jobs')
          .insert({
            user_id: user.id,
            prompt,
            settings: {
              ...settings,
              quality: settings.quality || 'high'
            },
            content_hash: contentHash,
            status: 'processing'
          })
          .select('id')
          .single();

        if (jobError) {
          console.error('Failed to create job:', jobError);
          throw new Error(`Failed to create image generation job: ${jobError.message}`);
        }

        jobId = newJob.id;
        console.log('Created new job:', jobId);
      }
    }

    const savedImages = [];

    // Process each image
    for (const [index, base64] of base64Images.entries()) {
      try {
        console.log(`Processing image ${index + 1}/${base64Images.length} for job ${jobId}`);
        
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

        // Save metadata to database with job reference
        const { data: dbData, error: dbError } = await supabase
          .from('generated_images')
          .insert({
            user_id: user.id,
            storage_path: fileName,
            public_url: publicUrl,
            prompt: prompt,
            settings: {
              ...settings,
              quality: settings.quality || 'high'
            },
            source_image_id: source_image_id || null,
            job_id: jobId
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

        console.log(`Successfully processed image ${index + 1} for job ${jobId}`);
        
      } catch (imageError) {
        console.error(`Failed to process image ${index + 1}:`, imageError);
        
        // Mark job as failed
        await supabase
          .from('image_jobs')
          .update({ 
            status: 'failed',
            error: `Failed to process image ${index + 1}: ${imageError.message}`
          })
          .eq('id', jobId);
          
        throw imageError;
      }
    }

    // Mark job as completed
    await supabase
      .from('image_jobs')
      .update({ 
        status: 'completed',
        output_url: savedImages[0]?.url || null
      })
      .eq('id', jobId);

    console.log(`Job ${jobId} completed successfully with ${savedImages.length} images`);

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
