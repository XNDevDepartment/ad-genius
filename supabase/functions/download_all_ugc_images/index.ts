// download_all_ugc_images: Returns signed URLs for all UGC images
// Memory-efficient approach that avoids buffering files in the edge function

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!);

const BUCKET = "ugc";
const PAGE_SIZE = 1000;
const SIGNED_URL_EXPIRY = 3600; // 1 hour

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// List objects recursively using prefix and pagination
async function listObjects(prefix = ""): Promise<Array<{ path: string; size: number }>> {
  const results: Array<{ path: string; size: number }> = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      console.error("Error listing objects:", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    for (const entry of data) {
      const p = prefix ? `${prefix}/${entry.name}` : entry.name;
      
      // Skip folder markers
      if (entry.name.endsWith("/")) continue;
      
      // If it's a folder (no id means it's a folder), recurse
      if (!(entry as any).id) {
        const subResults = await listObjects(p);
        results.push(...subResults);
        continue;
      }
      
      // It's a file
      const size = (entry as any).metadata?.size ?? 0;
      results.push({ path: p, size });
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return results;
}

// Generate signed URLs for files in batches
async function generateSignedUrls(
  files: Array<{ path: string; size: number }>
): Promise<Array<{ path: string; url: string | null; size: number }>> {
  const results: Array<{ path: string; url: string | null; size: number }> = [];
  
  // Process in batches of 50 to avoid overwhelming the API
  const batchSize = 50;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(file.path, SIGNED_URL_EXPIRY);
          
          if (error) {
            console.error(`Error creating signed URL for ${file.path}:`, error);
            return { path: file.path, url: null, size: file.size };
          }
          
          return { path: file.path, url: data.signedUrl, size: file.size };
        } catch (err) {
          console.error(`Exception for ${file.path}:`, err);
          return { path: file.path, url: null, size: file.size };
        }
      })
    );
    
    results.push(...batchResults);
    console.log(`Generated signed URLs: ${results.length}/${files.length}`);
  }
  
  return results;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const prefix = url.searchParams.get("prefix") ?? "";

    console.log(`Listing files in bucket "${BUCKET}" with prefix "${prefix}"`);

    // Enumerate files
    const files = await listObjects(prefix);
    
    if (files.length === 0) {
      return new Response(
        JSON.stringify({ message: "No files found", files: [], total: 0 }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${files.length} files, generating signed URLs...`);

    // Generate signed URLs for all files
    const filesWithUrls = await generateSignedUrls(files);
    
    // Filter out files that failed to get signed URLs
    const validFiles = filesWithUrls.filter((f) => f.url !== null);
    const totalSize = validFiles.reduce((sum, f) => sum + f.size, 0);

    console.log(`Generated ${validFiles.length} signed URLs (${filesWithUrls.length - validFiles.length} failed)`);

    return new Response(
      JSON.stringify({
        files: validFiles,
        total: validFiles.length,
        totalSize,
        failedCount: filesWithUrls.length - validFiles.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("Error in download_all_ugc_images:", e);
    return new Response(
      JSON.stringify({ error: String(e?.message ?? e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
