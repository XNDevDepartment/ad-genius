
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: any) => {
  console.log(`[UGC] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("UGC function started");
    
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    const user = userData.user;
      log("User authenticated", { userId: user.id });

    // Check if user is admin
    const { data: isAdminResult, error: adminError } = await supabaseService.rpc('is_user_admin', {
      check_user_id: user.id
    });
    const isAdmin = !adminError && isAdminResult;
    log("Admin check", { isAdmin });

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Handle POST requests with different actions
    if (req.method === 'POST') {
      const body = await req.json();
      const actionFromBody = body.action;

      if (actionFromBody === 'getJob') {
        const { jobId } = body;
        const { data: job, error } = await supabaseService
          .from('image_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          log('Error fetching job', { error, jobId });
          return new Response(JSON.stringify({ error: 'Failed to fetch job' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ job }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (actionFromBody === 'getJobImages') {
        const { jobId } = body;
        const { data: images, error } = await supabaseService
          .from('ugc_images')
          .select('*')
          .eq('job_id', jobId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          log('Error fetching job images', { error, jobId });
          return new Response(JSON.stringify({ error: 'Failed to fetch job images' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ images }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (actionFromBody === 'cancelJob') {
        const { jobId } = body;
        const { error } = await supabaseService
          .from('image_jobs')
          .update({ status: 'canceled' })
          .eq('id', jobId)
          .eq('user_id', user.id);

        if (error) {
          log('Error canceling job', { error, jobId });
          return new Response(JSON.stringify({ error: 'Failed to cancel job' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (actionFromBody === 'getActiveJob') {
        const { data: activeJob, error: jobError } = await supabaseService
          .from('image_jobs')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['queued', 'processing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (jobError && jobError.code !== 'PGRST116') {
          log("Error fetching active job", { error: jobError });
          return new Response(JSON.stringify({ error: 'Failed to fetch active job' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ job: activeJob || null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle image generation (createImageJob action or no action for backward compatibility)
      if (!actionFromBody || actionFromBody === 'createImageJob') {
        const { sourceImageId, prompt, settings } = body;
        
        log("Generation request received", { sourceImageId, settings });

        let creditCost = 0;
        let deductResult: any = null;

        // Skip credit checks and tier limits for admins
        if (!isAdmin) {
          // Get user's subscription data to check tier and enforce limits
          const { data: subscriber } = await supabaseService
            .from('subscribers')
            .select('subscription_tier, credits_balance')
            .eq('user_id', user.id)
            .single();

          const isFreeTier = !subscriber || subscriber.subscription_tier === 'Free' || !subscriber.subscription_tier;
          
          log("User tier check", { 
            tier: subscriber?.subscription_tier || 'Free', 
            isFreeTier,
            credits: subscriber?.credits_balance || 0
          });

          // Enforce Free tier limits
          if (isFreeTier) {
            const numImages = settings?.number || 1;
            if (numImages > 1) {
              return new Response(JSON.stringify({ 
                error: "Free tier limited to 1 image per generation. Upgrade to generate more images at once.",
                requiresUpgrade: true
              }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            // Check if trying to use premium scenarios
            const premiumScenarios = ['editorial', 'natural'];
            if (settings?.style && premiumScenarios.includes(settings.style)) {
              return new Response(JSON.stringify({ 
                error: "Premium scenarios are only available with paid plans. Please upgrade or choose a different style.",
                requiresUpgrade: true
              }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }

          // Calculate credit cost
          const calculateImageCost = (quality: string, count: number) => {
            const qualityCosts = { 'low': 1, 'medium': 1.5, 'high': 2 };
            return (qualityCosts[quality as keyof typeof qualityCosts] || 2) * count;
          };

          creditCost = calculateImageCost(
            settings?.quality || 'high',
            settings?.number || 1
          );

          log("Credit cost calculated", { creditCost, quality: settings?.quality, numImages: settings?.number });

          // Check if user has enough credits
          const currentBalance = subscriber?.credits_balance || 0;
          if (currentBalance < creditCost) {
            log("Insufficient credits", { required: creditCost, available: currentBalance });
            return new Response(JSON.stringify({ 
              error: "Insufficient credits",
              required: creditCost,
              available: currentBalance
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Deduct credits
          const { data: deductResultData, error: deductError } = await supabaseService
            .rpc('deduct_user_credits', {
              p_user_id: user.id,
              p_amount: creditCost,
              p_reason: 'ugc_generation'
            });

          if (deductError || !deductResultData?.success) {
            log("Failed to deduct credits", { error: deductError, result: deductResultData });
            return new Response(JSON.stringify({ 
              error: deductResultData?.error || "Failed to deduct credits"
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          deductResult = deductResultData;
          log("Credits deducted successfully", { 
            amount: creditCost, 
            newBalance: deductResult.new_balance 
          });
        } else {
          log("Admin user - skipping credit checks");
        }

        // Create job record
        const numImages = settings?.number || 1;
        const { data: job, error: jobError } = await supabaseService
          .from('image_jobs')
          .insert({
            user_id: user.id,
            prompt,
            settings: settings || {},
            status: 'queued',
            total: numImages,
            source_image_id: sourceImageId,
            content_hash: `${user.id}-${Date.now()}`
          })
          .select()
          .single();

        if (jobError) {
          log("Failed to create job", { error: jobError });
          
          // Refund credits on job creation failure (only if not admin)
          if (!isAdmin && creditCost > 0) {
            await supabaseService.rpc('refund_user_credits', {
              p_user_id: user.id,
              p_amount: creditCost,
              p_reason: 'job_creation_failed'
            });
          }
          
          throw jobError;
        }

        log("Job created successfully", { jobId: job.id });

        // Simulate image generation process
        setTimeout(async () => {
          try {
            log("Starting image generation simulation", { jobId: job.id });
            
            // Update job status to processing
            await supabaseService
              .from('image_jobs')
              .update({ 
                status: 'processing', 
                started_at: new Date().toISOString(),
                progress: 20 
              })
              .eq('id', job.id);

            // Simulate generation progress
            for (let i = 0; i < numImages; i++) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay per image
              
              const progress = Math.round(((i + 1) / numImages) * 80) + 20; // 20-100%
              
              // Generate a sample image URL
              const imageUrl = `https://dhqdamfisdbbcieqlpvt.supabase.co/storage/v1/object/public/ugc/sample_${job.id}_${i + 1}.jpg`;
              
              // Create UGC image record
              await supabaseService
                .from('ugc_images')
                .insert({
                  job_id: job.id,
                  user_id: user.id,
                  source_image_id: sourceImageId,
                  public_url: imageUrl,
                  storage_path: `sample_${job.id}_${i + 1}.jpg`,
                  prompt,
                  meta: { 
                    settings: settings || {},
                    generation_time: new Date().toISOString()
                  }
                });

              // Update job progress
              await supabaseService
                .from('image_jobs')
                .update({ 
                  progress,
                  completed: i + 1
                })
                .eq('id', job.id);

              log("Generated image", { jobId: job.id, imageIndex: i + 1, progress });
            }

            // Mark job as completed
            await supabaseService
              .from('image_jobs')
              .update({ 
                status: 'completed',
                progress: 100,
                finished_at: new Date().toISOString()
              })
              .eq('id', job.id);

            log("Job completed successfully", { jobId: job.id });

          } catch (error) {
            log("Error during generation simulation", { jobId: job.id, error });
            
            // Mark job as failed and refund credits (only if not admin)
            await supabaseService
              .from('image_jobs')
              .update({ 
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
                finished_at: new Date().toISOString()
              })
              .eq('id', job.id);

            if (!isAdmin && creditCost > 0) {
              await supabaseService.rpc('refund_user_credits', {
                p_user_id: user.id,
                p_amount: creditCost,
                p_reason: 'generation_failed'
              });
            }
          }
        }, 1000);

        return new Response(JSON.stringify({ 
          success: true, 
          jobId: job.id,
          creditsDeducted: isAdmin ? 0 : creditCost,
          remainingCredits: isAdmin ? 'unlimited' : deductResult?.new_balance
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Handle GET request for active job (legacy support)
    if (action === 'get-active-job') {
      log("Getting active job for user");
      
      const { data: activeJob, error: jobError } = await supabaseService
        .from('image_jobs')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['queued', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (jobError && jobError.code !== 'PGRST116') {
        log("Error fetching active job", { error: jobError });
        throw jobError;
      }

      return new Response(JSON.stringify({ job: activeJob || null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log("Error in UGC function", { error: error.message });
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
