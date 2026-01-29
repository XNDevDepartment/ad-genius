import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrphanedJob {
  id: string;
  user_id: string;
  metadata: Record<string, unknown> | null;
  finished_at: string | null;
}

interface RecoveryDetail {
  jobId: string;
  userId: string;
  storagePath: string;
  status: "recovered" | "skipped" | "failed";
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse query parameters
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const targetUserId = url.searchParams.get("userId");

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user is admin
      const { data: isAdmin } = await supabase.rpc("is_user_admin", { check_user_id: user.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[Recovery] Starting recovery process. DryRun: ${dryRun}, TargetUser: ${targetUserId || "all"}`);

    // Step 1: Get all job IDs that already have results
    const { data: existingResults, error: resultsError } = await supabase
      .from("outfit_swap_results")
      .select("job_id");

    if (resultsError) {
      throw new Error(`Failed to fetch existing results: ${resultsError.message}`);
    }

    const existingJobIds = new Set((existingResults || []).map(r => r.job_id));
    console.log(`[Recovery] Found ${existingJobIds.size} jobs with existing results`);

    // Step 2: Get orphaned jobs (completed but no results)
    let orphanedJobsQuery = supabase
      .from("outfit_swap_jobs")
      .select("id, user_id, metadata, finished_at")
      .eq("status", "completed");

    if (targetUserId) {
      orphanedJobsQuery = orphanedJobsQuery.eq("user_id", targetUserId);
    }

    const { data: allCompletedJobs, error: jobsError } = await orphanedJobsQuery;

    if (jobsError) {
      throw new Error(`Failed to fetch completed jobs: ${jobsError.message}`);
    }

    // Filter out jobs that already have results
    const orphanedJobs: OrphanedJob[] = (allCompletedJobs || []).filter(
      job => !existingJobIds.has(job.id)
    );

    console.log(`[Recovery] Found ${orphanedJobs.length} orphaned jobs to process`);

    const recoveryDetails: RecoveryDetail[] = [];
    const failureReasons: Record<string, number> = {};
    let recoveredCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Step 3: Process each orphaned job
    for (const job of orphanedJobs) {
      const storagePath = `${job.user_id}/${job.id}`;
      
      try {
        // List files in the job's storage folder
        const { data: files, error: listError } = await supabase.storage
          .from("outfit-user-models")
          .list(storagePath);

        if (listError) {
          console.error(`[Recovery] Failed to list files for job ${job.id}: ${listError.message}`);
          failedCount++;
          failureReasons["storage_list_error"] = (failureReasons["storage_list_error"] || 0) + 1;
          recoveryDetails.push({
            jobId: job.id,
            userId: job.user_id,
            storagePath,
            status: "failed",
            reason: `Storage list error: ${listError.message}`,
          });
          continue;
        }

        if (!files || files.length === 0) {
          console.log(`[Recovery] No files found for job ${job.id}`);
          failedCount++;
          failureReasons["no_files_in_storage"] = (failureReasons["no_files_in_storage"] || 0) + 1;
          recoveryDetails.push({
            jobId: job.id,
            userId: job.user_id,
            storagePath,
            status: "failed",
            reason: "No files found in storage",
          });
          continue;
        }

        // Find result file (pattern: result_*.jpg or result_*.png)
        const resultJpgFile = files.find(f => f.name.startsWith("result_") && f.name.endsWith(".jpg"));
        const resultPngFile = files.find(f => f.name.startsWith("result_") && f.name.endsWith(".png"));

        if (!resultJpgFile && !resultPngFile) {
          console.log(`[Recovery] No result file found for job ${job.id}. Files: ${files.map(f => f.name).join(", ")}`);
          failedCount++;
          failureReasons["no_result_file"] = (failureReasons["no_result_file"] || 0) + 1;
          recoveryDetails.push({
            jobId: job.id,
            userId: job.user_id,
            storagePath,
            status: "failed",
            reason: `No result file found. Available files: ${files.map(f => f.name).join(", ")}`,
          });
          continue;
        }

        // Prefer JPG, fall back to PNG
        const primaryFile = resultJpgFile || resultPngFile!;
        const primaryPath = `${storagePath}/${primaryFile.name}`;
        
        // Generate public URLs
        const { data: publicUrlData } = supabase.storage
          .from("outfit-user-models")
          .getPublicUrl(primaryPath);

        const publicUrl = publicUrlData.publicUrl;

        // Check for both JPG and PNG versions
        let jpgUrl: string | null = null;
        let pngUrl: string | null = null;

        if (resultJpgFile) {
          const jpgPath = `${storagePath}/${resultJpgFile.name}`;
          const { data: jpgData } = supabase.storage.from("outfit-user-models").getPublicUrl(jpgPath);
          jpgUrl = jpgData.publicUrl;
        }

        if (resultPngFile) {
          const pngPath = `${storagePath}/${resultPngFile.name}`;
          const { data: pngData } = supabase.storage.from("outfit-user-models").getPublicUrl(pngPath);
          pngUrl = pngData.publicUrl;
        }

        if (dryRun) {
          console.log(`[Recovery] DRY RUN - Would recover job ${job.id}: ${primaryPath}`);
          recoveredCount++;
          recoveryDetails.push({
            jobId: job.id,
            userId: job.user_id,
            storagePath: primaryPath,
            status: "recovered",
            reason: "Dry run - would insert",
          });
          continue;
        }

        // Insert the missing result record
        const { error: insertError } = await supabase
          .from("outfit_swap_results")
          .insert({
            job_id: job.id,
            user_id: job.user_id,
            storage_path: primaryPath,
            public_url: publicUrl,
            jpg_url: jpgUrl,
            png_url: pngUrl,
            metadata: {
              recovered: true,
              recovered_at: new Date().toISOString(),
              original_metadata: job.metadata,
              original_finished_at: job.finished_at,
            },
          });

        if (insertError) {
          console.error(`[Recovery] Failed to insert result for job ${job.id}: ${insertError.message}`);
          failedCount++;
          failureReasons["insert_error"] = (failureReasons["insert_error"] || 0) + 1;
          recoveryDetails.push({
            jobId: job.id,
            userId: job.user_id,
            storagePath: primaryPath,
            status: "failed",
            reason: `Insert error: ${insertError.message}`,
          });
          continue;
        }

        console.log(`[Recovery] Successfully recovered job ${job.id}`);
        recoveredCount++;
        recoveryDetails.push({
          jobId: job.id,
          userId: job.user_id,
          storagePath: primaryPath,
          status: "recovered",
        });

      } catch (error) {
        console.error(`[Recovery] Unexpected error processing job ${job.id}:`, error);
        failedCount++;
        failureReasons["unexpected_error"] = (failureReasons["unexpected_error"] || 0) + 1;
        recoveryDetails.push({
          jobId: job.id,
          userId: job.user_id,
          storagePath,
          status: "failed",
          reason: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    const response = {
      dryRun,
      targetUserId: targetUserId || null,
      summary: {
        totalOrphanedJobs: orphanedJobs.length,
        recoveredJobs: recoveredCount,
        failedJobs: failedCount,
        skippedJobs: skippedCount,
        failureReasons,
      },
      recoveredDetails,
    };

    console.log(`[Recovery] Complete. Recovered: ${recoveredCount}, Failed: ${failedCount}`);

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Recovery] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
