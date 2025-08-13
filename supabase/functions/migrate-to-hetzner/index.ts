// supabase/functions/migrate-to-hetzner/index.ts
// Edge Function to migrate images from Supabase Storage to Hetzner Object Storage (S3‑compatible)
// Uses AWS SDK for JavaScript v3 with npm ESM imports (compatible with Supabase Edge / Deno).
// ‣ Path‑style addressing, per‑step timeouts, correct CORS, small parallel batches, robust skip logic.
import "https://deno.land/x/xhr@0.1.0/mod.ts"; // polyfill required by AWS SDK v3 on Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
// AWS SDK v3 via npm (no explicit fetch-http-handler import needed)
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.658.0";
// ─────────────────────────────────────────────────────────────────────────────
// ENV
// ─────────────────────────────────────────────────────────────────────────────
const HETZNER_ACCESS_KEY_ID = Deno.env.get("HETZNER_ACCESS_KEY_ID");
const HETZNER_SECRET_ACCESS_KEY = Deno.env.get("HETZNER_SECRET_ACCESS_KEY");
const HETZNER_BUCKET_NAME = Deno.env.get("HETZNER_BUCKET_NAME");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
console.log("ENV:", {
  HETZNER_ACCESS_KEY_ID: HETZNER_ACCESS_KEY_ID ? "SET" : "UNDEFINED",
  HETZNER_SECRET_ACCESS_KEY: HETZNER_SECRET_ACCESS_KEY ? "SET" : "UNDEFINED",
  HETZNER_BUCKET_NAME: HETZNER_BUCKET_NAME ?? "UNDEFINED",
  SUPABASE_URL: SUPABASE_URL ? "SET" : "UNDEFINED",
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? "SET" : "UNDEFINED"
});
// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────────────────────────────────────
const s3 = new S3Client({
  endpoint: "https://nbg1.your-objectstorage.com",
  region: "eu-central",
  forcePathStyle: true,
  credentials: {
    accessKeyId: HETZNER_ACCESS_KEY_ID ?? "",
    secretAccessKey: HETZNER_SECRET_ACCESS_KEY ?? ""
  }
});
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const corsFor = (req)=>{
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400"
  };
};
const withTimeout = (p, ms, label)=>Promise.race([
    p,
    new Promise((_, r)=>setTimeout(()=>r(new Error(`${label} timeout after ${ms}ms`)), ms))
  ]);
const guessContentType = (path)=>{
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "application/octet-stream";
};
async function processOne(image, bucket) {
  const already = image.public_url?.startsWith(`https://${bucket}.nbg1.your-objectstorage.com/`);
  if (already) {
    console.log("Skip:", image.id);
    return {
      id: image.id,
      skipped: true
    };
  }
  console.log("Download ->", image.id, image.storage_path);
  const { data: fileData, error: dlErr } = await withTimeout(supabase.storage.from("generated-images").download(image.storage_path), 20_000, "download");
  if (dlErr) throw new Error(`download failed: ${dlErr.message}`);
  const buf = new Uint8Array(await fileData.arrayBuffer());
  const key = `migrated/${image.storage_path}`;
  const contentType = guessContentType(image.storage_path);
  console.log("Upload ->", image.id, key);
  await withTimeout(s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buf,
    ContentType: contentType
  })), 80_000, "s3-put");
  const publicUrl = `https://${bucket}.nbg1.your-objectstorage.com/${key}`;
  console.log("DB update ->", image.id);
  const { error: updErr } = await withTimeout(supabase.from("generated_images").update({
    public_url: publicUrl,
    storage_path: key,
    updated_at: new Date().toISOString()
  }).eq("id", image.id), 10_000, "db-update");
  if (updErr) throw new Error(`db update failed: ${updErr.message}`);
  return {
    id: image.id,
    skipped: false
  };
}
// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req)=>{
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, {
    headers: corsHeaders
  });
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
    console.log("Starting migration. Bucket:", HETZNER_BUCKET_NAME);
    const { data: images, error: fetchErr } = await supabase.from("generated_images").select("id, public_url, storage_path, created_at").order("created_at", {
      ascending: true
    });
    if (fetchErr) throw new Error(`failed to fetch images: ${fetchErr.message}`);
    console.log(`Found ${images?.length ?? 0} images`);
    const BATCH = 3;
    let migrated = 0;
    const errors = [];
    for(let i = 0; i < (images?.length ?? 0); i += BATCH){
      const chunk = images.slice(i, i + BATCH);
      const results = await Promise.allSettled(chunk.map((img)=>processOne(img, HETZNER_BUCKET_NAME)));
      results.forEach((r, idx)=>{
        const id = chunk[idx]?.id;
        if (r.status === "fulfilled") {
          if (!r.value.skipped) migrated++;
          console.log("OK ->", id);
        } else {
          console.error("ERR ->", id, r.reason?.message ?? r.reason);
          errors.push({
            id,
            error: String(r.reason?.message ?? r.reason)
          });
        }
      });
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
      status: 502,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
