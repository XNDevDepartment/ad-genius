// supabase/functions/hetzner-test/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async ()=>{
  const logs = [];
  // 1. Direct HEAD request to Hetzner endpoint
  logs.push("Step 1: Testing https://nbg1.your-objectstorage.com ...");
  try {
    const resp = await fetch("https://nbg1.your-objectstorage.com", {
      method: "HEAD"
    });
    logs.push(`Step 1: Success — Status ${resp.status}`);
  } catch (err) {
    logs.push(`Step 1: FAILED — ${err}`);
    return new Response(logs.join("\n"), {
      status: 500
    });
  }
  // 2. Direct HEAD request to bucket hostname
  logs.push("Step 2: Testing https://produktpix.nbg1.your-objectstorage.com ...");
  try {
    const resp = await fetch("https://produktpix.nbg1.your-objectstorage.com", {
      method: "HEAD"
    });
    logs.push(`Step 2: Success — Status ${resp.status}`);
  } catch (err) {
    logs.push(`Step 2: FAILED — ${err}`);
    return new Response(logs.join("\n"), {
      status: 500
    });
  }
  // 3. Test small object PUT with fetch (raw HTTP, no SDK)
  logs.push("Step 3: Testing signed PUT to bucket...");
  try {
    // This won't actually upload unless you set a signed URL, just checks connectivity
    const testResp = await fetch("https://nbg1.your-objectstorage.com", {
      method: "PUT",
      body: "test"
    });
    logs.push(`Step 3: PUT request completed — Status ${testResp.status}`);
  } catch (err) {
    logs.push(`Step 3: FAILED — ${err}`);
    return new Response(logs.join("\n"), {
      status: 500
    });
  }
  return new Response(logs.join("\n"), {
    status: 200
  });
});
