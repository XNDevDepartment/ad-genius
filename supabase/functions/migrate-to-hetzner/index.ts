// supabase/functions/migrate-to-hetzner/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
// ✅ Use AWS SDK v3 (npm in Deno)
import { S3Client, PutObjectCommand, HeadObjectCommand } from "npm:@aws-sdk/client-s3@3.670.0";


const origin = req.headers.get("origin") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, PUT, GET"
};

if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

const HETZNER_ACCESS_KEY_ID = Deno.env.get("HETZNER_ACCESS_KEY_ID");
const HETZNER_SECRET_ACCESS_KEY = Deno.env.get("HETZNER_SECRET_ACCESS_KEY");
const HETZNER_BUCKET_NAME = Deno.env.get("HETZNER_BUCKET_NAME");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Quick sanity log (safe to keep during setup)
console.log("ENV:", {
  HETZNER_ACCESS_KEY_ID: HETZNER_ACCESS_KEY_ID ? "SET" : "UNDEFINED",
  HETZNER_SECRET_ACCESS_KEY: HETZNER_SECRET_ACCESS_KEY ? "SET" : "UNDEFINED",
  HETZNER_BUCKET_NAME: HETZNER_BUCKET_NAME ?? "UNDEFINED",
  SUPABASE_URL: SUPABASE_URL ? "SET" : "UNDEFINED",
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? "SET" : "UNDEFINED"
});


// helper
const withTimeout = <T>(p: Promise<T>, ms: number, label: string) =>
  Promise.race([p, new Promise<never>((_, r)=>setTimeout(()=>r(new Error(`${label} timeout ${ms}ms`)), ms))]);



// ✅ S3 client pointing at Hetzner Object Storage
const s3 = new S3Client({
  region: "nbg1",
  endpoint: "https://produktpix.nbg1.your-objectstorage.com",
  useSSL: true,
  forcePathStyle: true,
  credentials: {
    accessKeyId: HETZNER_ACCESS_KEY_ID ?? "",
    secretAccessKey: HETZNER_SECRET_ACCESS_KEY ?? ""
  }
});



const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);


function guessContentType(path) {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "application/octet-stream";
}


serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  // Guard: all envs present?
  const missing = [];
  if (!HETZNER_ACCESS_KEY_ID) missing.push("HETZNER_ACCESS_KEY_ID");
  if (!HETZNER_SECRET_ACCESS_KEY) missing.push("HETZNER_SECRET_ACCESS_KEY");
  if (!HETZNER_BUCKET_NAME) missing.push("HETZNER_BUCKET_NAME");
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");


  if (missing.length) {
    return new Response(JSON.stringify({
      error: `Missing env vars: ${missing.join(", ")}`
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }


  try {
    console.log("Starting migration to Hetzner. Bucket:", HETZNER_BUCKET_NAME);
    // 1) Fetch images list
    const { data: images, error: fetchErr } = await supabase.from("generated_images").select("*").order("created_at", {
      ascending: true
    });
    if (fetchErr) throw new Error(`Failed to fetch images: ${fetchErr.message}`);
    console.log(`Found ${images?.length ?? 0} images`);
    let migrated = 0;
    const errors = [];
    for (const image of images ?? []){
      try {
        // Skip if already migrated to this bucket
        const alreadyOnHetzner = image.public_url?.includes(`${HETZNER_BUCKET_NAME}.nbg1.your-objectstorage.com`);
        if (alreadyOnHetzner) {
          console.log("Skip (already migrated):", image.id);
          continue;
        }
        console.log("entrei 1")
        // 2) Download from Supabase Storage
        const { data: fileData, error: dlErr } = await supabase.storage.from("generated-images").download(image.storage_path);
        console.log("entrei 2")
        if (dlErr) throw new Error(`Download failed: ${dlErr.message}`);
        console.log("entrei 3")
        const buf = new Uint8Array(await fileData.arrayBuffer());
        // 3) Decide destination path + contentType
        const newKey = `migrated/${image.storage_path}`; // keep original structure under "migrated/"
        const contentType = guessContentType(image.storage_path);
        console.log("entrei 4")
        // 4) Upload to Hetzner (AWS SDK v3)
        const put = new PutObjectCommand({
          Bucket: HETZNER_BUCKET_NAME,
          Key: newKey,
          Body: buf,
          ContentType: contentType
        });
        try{
          console.log("entrei 5")
          await withTimeout(
            s3.send(new PutObjectCommand({
              Bucket: Deno.env.get("HETZNER_BUCKET_NAME")!,
              Key: newKey,
              Body: buf,
              ContentType: contentType,
            })),
            15000,
            "s3-put"
          );

        }catch(e){
          console.error("s3 put FAIL:", e);
          return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 5) Build new public URL (bucket in subdomain)
        console.log("entrei 6")
        const newPublicUrl = `https://${HETZNER_BUCKET_NAME}.nbg1.your-objectstorage.com/${newKey}`;
        console.log("entrei 7")

        // 6) Update DB row
        const { error: updErr } = await supabase.from("generated_images").update({
          public_url: newPublicUrl,
          storage_path: newKey,
          updated_at: new Date().toISOString()
        }).eq("id", image.id);
        if (updErr) throw new Error(`DB update failed: ${updErr.message}`);
        migrated++;
        console.log("Migrated:", image.id);
      } catch (e) {
        console.error("Error migrating", image?.id, e);
        errors.push({
          id: image?.id ?? "unknown",
          error: String(e?.message ?? e)
        });
      }
    }
    const payload = {
      total: images?.length ?? 0,
      migrated,
      failed: errors.length,
      errors: errors.slice(0, 10)
    };
    console.log("Done:", payload);
    return new Response(JSON.stringify(payload), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error("Fatal:", e);
    return new Response(JSON.stringify({
      error: String(e?.message ?? e)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
