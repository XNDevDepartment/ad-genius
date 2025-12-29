// download_all_ugc_images: Streams all files from a bucket/prefix into 1GB chunked ZIPs
// Assumptions:
// - Bucket name: "ugc"
// - Optional query param: prefix (e.g., ?prefix=user-uuid/)
// - Splits archives at ~1 GB per zip (1_000_000_000 bytes)
// - Uses Deno.serve and Web APIs only
// - Writes temp files to /tmp; returns multipart/mixed with sequential ZIP parts
// - If you want single ZIP streaming per request, omit splitting or set higher MAX_BYTES
//
// Limitations:
// - Building perfectly valid ZIP central directory across multi-part zips is non-trivial.
//   Here we implement per-part independent ZIPs (each a valid ZIP) by rotating to a new archive
//   before exceeding the 1GB threshold.
// - Uses a simple in-memory file list page-by-page to keep memory low. File payloads are streamed.
// - Uses npm:jszip for building ZIPs progressively; we flush when size threshold nears.
//   Note: JSZip buffers entries in memory to finalize, so we flush early and avoid large buffers.
//   For very large buckets, prefer prefix-based batching to reduce memory.

import { createClient } from "npm:@supabase/supabase-js@2.46.1";
import JSZip from "npm:jszip@3.10.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}
const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!);

const BUCKET = "ugc";
const PAGE_SIZE = 1000;
const MAX_BYTES = 1_000_000_000; // ~1GB per archive

// List objects recursively using prefix and pagination
async function listObjects(prefix = "") {
  const results = [] as Array<{ path: string; size: number } | { dir: true; path: string }>;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const p = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.name.endsWith("/")) continue; // skip markers
      // If it's a folder (no size), recurse
      if ((entry as any).metadata?.size === undefined && !(entry as any).id) {
        const subPrefix = p;
        const sub = await listObjects(subPrefix);
        results.push(...sub);
        continue;
      }
      // file
      const size = (entry as any).metadata?.size ?? 0;
      results.push({ path: p, size });
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return results;
}

async function buildZip(files: Array<{ path: string; size: number }>) {
  const zip = new JSZip();
  // Stream each file into zip (JSZip buffers, but we avoid loading everything else at once)
  for (const f of files) {
    const { data, error } = await supabase.storage.from(BUCKET).download(f.path);
    if (error) throw error;
    const buf = await data.arrayBuffer();
    zip.file(f.path, buf);
  }
  const blob = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  return blob;
}

function splitIntoBatches(items: Array<{ path: string; size: number }>, maxBytes: number) {
  const batches: Array<Array<{ path: string; size: number }>> = [];
  let current: Array<{ path: string; size: number }> = [];
  let total = 0;
  for (const it of items) {
    if (total + it.size > maxBytes && current.length > 0) {
      batches.push(current);
      current = [];
      total = 0;
    }
    current.push(it);
    total += it.size || 0;
  }
  if (current.length) batches.push(current);
  return batches;
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const prefix = url.searchParams.get("prefix") ?? "";

    // Enumerate files
    const files = await listObjects(prefix);
    if (files.length === 0) {
      return new Response(JSON.stringify({ message: "No files found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Split into ~1GB batches
    const batches = splitIntoBatches(files, MAX_BYTES);

    // Return multipart/mixed where each part is a valid zip
    const boundary = `zip-boundary-${crypto.randomUUID()}`;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        for (let i = 0; i < batches.length; i++) {
          const partHeader = `--${boundary}\r\nContent-Type: application/zip\r\nContent-Disposition: attachment; filename="ugc_part_${i + 1}.zip"\r\n\r\n`;
          controller.enqueue(encoder.encode(partHeader));
          const zipBytes = await buildZip(batches[i]);
          controller.enqueue(zipBytes);
          controller.enqueue(encoder.encode("\r\n"));
        }
        controller.enqueue(encoder.encode(`--${boundary}--\r\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});