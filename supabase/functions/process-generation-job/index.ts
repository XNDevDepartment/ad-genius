import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import OpenAI from "https://esm.sh/openai@4.20.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody;
  try {
    requestBody = await req.json();
    const { jobId } = requestBody;
    console.log('Processing generation job:', jobId);

    // Get the job details
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    if (job.status !== 'pending') {
      console.log(`Job ${jobId} is not pending, current status: ${job.status}`);
      return new Response(JSON.stringify({ message: 'Job already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update job status to in_progress
    await supabase
      .from('generation_jobs')
      .update({ 
        status: 'in_progress', 
        started_at: new Date().toISOString(),
        progress: 10
      })
      .eq('id', jobId);

    console.log(`Started processing job ${jobId} with prompt: ${job.prompt}`);

    // Generate images using OpenAI
    const settings = job.settings || {};
    const numberOfImages = settings.numberOfImages || 1;
    const size = settings.size || '1024x1024';
    const quality = settings.quality || 'standard';

    const generatedImages = [];
    let currentProgress = 10;
    const progressIncrement = 80 / numberOfImages; // 80% for generation, 10% for saving

    for (let i = 0; i < numberOfImages; i++) {
      try {
        console.log(`Generating image ${i + 1} of ${numberOfImages}`);
        
        const response = await openai.images.generate({
          model: "gpt-image-1",
          prompt: job.prompt,
          n: 1,
          size: size as "1024x1024" | "1792x1024" | "1024x1792",
          quality: quality as "standard" | "hd",
        });

        if (response.data && response.data[0] && response.data[0].b64_json) {
          generatedImages.push(response.data[0].b64_json);
          
          // Update progress
          currentProgress += progressIncrement;
          await supabase
            .from('generation_jobs')
            .update({ 
              progress: Math.round(currentProgress),
              generated_images_count: i + 1
            })
            .eq('id', jobId);

          console.log(`Generated image ${i + 1}, progress: ${Math.round(currentProgress)}%`);
        }
      } catch (error) {
        console.error(`Error generating image ${i + 1}:`, error);
        // Continue with other images instead of failing completely
      }
    }

    if (generatedImages.length === 0) {
      throw new Error('No images were generated successfully');
    }

    console.log(`Generated ${generatedImages.length} images, now saving to storage`);

    // Save images to storage and database
    const savedImages = [];
    for (let i = 0; i < generatedImages.length; i++) {
      try {
        const base64Data = generatedImages[i];
        const fileName = `${job.user_id}/${jobId}/image_${i + 1}_${Date.now()}.png`;
        
        // Convert base64 to blob
        const imageData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('generated-images')
          .upload(fileName, imageData, {
            contentType: 'image/png',
            cacheControl: '3600',
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        // Save to generated_images table
        const { data: imageRecord, error: imageError } = await supabase
          .from('generated_images')
          .insert({
            user_id: job.user_id,
            prompt: job.prompt,
            public_url: urlData.publicUrl,
            storage_path: fileName,
            settings: job.settings,
          })
          .select()
          .single();

        if (imageError) {
          console.error('Error saving image record:', imageError);
          continue;
        }

        // Link image to job
        await supabase
          .from('generated_images_jobs')
          .insert({
            generation_job_id: jobId,
            generated_image_id: imageRecord.id,
          });

        savedImages.push(imageRecord);
        console.log(`Saved image ${i + 1} to storage and database`);
      } catch (error) {
        console.error(`Error saving image ${i + 1}:`, error);
      }
    }

    // Update job status to completed
    await supabase
      .from('generation_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress: 100,
        generated_images_count: savedImages.length
      })
      .eq('id', jobId);

    console.log(`Job ${jobId} completed with ${savedImages.length} images`);

    // Send email notification if user has email notifications enabled
    try {
      const { data: notificationPrefs } = await supabase
        .from('notification_preferences')
        .select('email_generation_complete')
        .eq('user_id', job.user_id)
        .single();

      if (notificationPrefs?.email_generation_complete) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', job.user_id)
          .single();

        if (profile?.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: profile.email,
              subject: 'Your images are ready!',
              html: `
                <h2>Generation Complete</h2>
                <p>Hi ${profile.name || 'there'},</p>
                <p>Your image generation is complete! We've generated ${savedImages.length} image${savedImages.length !== 1 ? 's' : ''} based on your prompt:</p>
                <blockquote style="font-style: italic; margin: 16px 0; padding: 8px 16px; border-left: 4px solid #ccc;">
                  "${job.prompt}"
                </blockquote>
                <p>You can view and save your images by returning to the app.</p>
                <p>Best regards,<br>Your Image Generation Team</p>
              `,
            },
          });
        }
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        imagesGenerated: savedImages.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-generation-job:', error);

    // Update job status to failed if we have the jobId
    try {
      if (requestBody?.jobId) {
        await supabase
          .from('generation_jobs')
          .update({ 
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', requestBody.jobId);
      }
    } catch (updateError) {
      console.error('Error updating job status to failed:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});