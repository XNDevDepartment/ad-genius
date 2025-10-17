import { supabase } from '@/integrations/supabase/client';

export type ImageJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';

export type CreateJobPayload = {
  prompt: string;
  settings: {
    number: number;
    size?: '1024x1024' | '2048x2048' | '896x1280' | '1792x2560' | '1280x896' | '2560x1792' | '768x1408' | '1536x2816' | '1408x768' | '2816x1536 '| '1536x1024' | '1024x1536';
    quality: 'low' | 'medium' | 'high';
    orientation?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
    aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | 'source'; // For post-generation cropping
    style?: 'lifestyle' | 'minimal' | 'vibrant' | 'professional' | 'cinematic' | 'natural';
    timeOfDay?: 'natural' | 'golden' | 'night' | 'morning';
    highlight?: 'yes' | 'no';
    output_format?: 'png' | 'webp';
  };
  source_image_id?: string; // Legacy: single source image (backward compatible)
  source_image_ids?: string[]; // New: multiple source images
  desiredAudience?: string; // User's desired audience
  prodSpecs?: string; // User's product specifications
};

export type JobRow = {
  id: string;
  user_id: string;
  status: ImageJobStatus;
  progress: number;
  total: number;
  completed: number;
  failed: number;
  prompt: string;
  settings: Record<string, any>;
  error?: string | null;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  model_type: 'gemini';
};

export type UgcImageRow = {
  id: string;
  job_id: string;
  user_id: string;
  storage_path: string;
  public_url: string;
  meta?: any;
  created_at: string;
  prompt: string;
  public_showcase: boolean;
  source_image_id: string;
  updated_at: string;
};

async function callUgcGeminiFunction(action: string, payload: any = {}, maxRetries = 3) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Set timeout based on action type - no timeout for job creation
  const timeout = action === 'createImageJob' ? null : 30000; // No timeout for job creation, 30s for others
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[UGC-GEMINI API] ${action} - Attempt ${attempt}/${maxRetries}`, payload);
      
      const controller = new AbortController();
      const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

      const response = await fetch(`https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/ugc-gemini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, ...payload }),
        signal: controller.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      const data = await response.json();
      
      if (!response.ok) {
        const error = data.error || 'Request failed';
        console.error(`[UGC-GEMINI API] ${action} failed:`, { status: response.status, error, attempt });
        
        // Retry on server errors or timeouts, but not on auth/client errors
        if (attempt < maxRetries && (response.status >= 500 || response.status === 408)) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff up to 5s
          console.log(`[UGC-GEMINI API] Retrying ${action} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Add context to error messages for better debugging
        if (response.status === 404) {
          throw new Error(`${error} (Job may not exist or may have been processed already)`);
        } else if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed: ${error}`);
        }
        
        throw new Error(error);
      }

      console.log(`[UGC-GEMINI API] ${action} succeeded on attempt ${attempt}`, data);
      return data;
    } catch (error: any) {
      console.error(`[UGC-GEMINI API] ${action} error on attempt ${attempt}:`, error);
      
      // Don't retry on abort/timeout or non-retryable errors
      if (error.name === 'AbortError') {
        throw new Error(timeout ? `Request timeout after ${timeout/1000}s` : 'Request was aborted');
      }
      
      if (attempt === maxRetries || error.message.includes('Authentication failed')) {
        throw error;
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`[UGC-GEMINI API] Retrying ${action} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts`);
}

export async function createImageJob(payload: CreateJobPayload): Promise<{jobId: string, status?: string, existingImages?: any[]}> {
  return callUgcGeminiFunction('createImageJob', payload);
}

export async function getJob(jobId: string): Promise<{job: JobRow}> {
  return callUgcGeminiFunction('getJob', { jobId });
}

export async function getJobImages(jobId: string): Promise<{images: UgcImageRow[]}> {
  return callUgcGeminiFunction('getJobImages', { jobId });
}

export async function cancelJob(jobId: string): Promise<{success: boolean}> {
  return callUgcGeminiFunction('cancelJob', { jobId });
}

export async function resumeJob(jobId: string): Promise<{success: boolean}> {
  return callUgcGeminiFunction('resumeJob', { jobId });
}

export async function getActiveJobForUser(): Promise<{job: JobRow | null}> {
  return callUgcGeminiFunction('getActiveJob');
}

export function subscribeJob(jobId: string, onUpdate: (row: any) => void) {
  console.log(`[UGC-GEMINI API] Setting up job subscription for ${jobId}`);
  
  const channel = supabase
    .channel(`gemini-image-job:${jobId}`)
    .on(
      'postgres_changes',
      { event: '*',
        schema: 'public',
        table: 'image_jobs',
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        console.log(`[UGC-GEMINI API] Job update received:`, payload);
        const row = (payload as any).new ?? (payload as any).record ?? null;
        if (row && row.model_type === 'gemini') onUpdate(row);
      }
    )
    .subscribe(async (status) => {
      console.log(`[UGC-GEMINI API] Job subscription status: ${status}`);
      if (status === 'SUBSCRIBED') {
        try {
          const { data, error } = await supabase
            .from('image_jobs')
            .select('*')
            .eq('id', jobId)
            .eq('model_type', 'gemini')
            .maybeSingle();
          if (error) {
            console.error(`[UGC-GEMINI API] Failed to fetch initial job data:`, error);
          } else if (data) {
            console.log(`[UGC-GEMINI API] Initial job sync:`, data);
            onUpdate(data as JobRow);
          }
        } catch (error) {
          console.error(`[UGC-GEMINI API] Error in initial job sync:`, error);
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[UGC-GEMINI API] Job subscription error for ${jobId}`);
      }
    });

  return () => {
    console.log(`[UGC-GEMINI API] Cleaning up job subscription for ${jobId}`);
    supabase.removeChannel(channel);
  };
}

export function subscribeJobImages(jobId: string, onUpdate: (images: UgcImageRow[]) => void) {
  console.log(`[UGC-GEMINI API] Setting up images subscription for job ${jobId}`);
  
  const channel = supabase
    .channel(`gemini-job-images:${jobId}`)
    .on(
      'postgres_changes',
      { event: '*',
        schema: 'public',
        table: 'ugc_images',
        filter: `job_id=eq.${jobId}`
      },
      async (payload) => {
        console.log(`[UGC-GEMINI API] Images update received:`, payload);
        // Refetch all images for this job when any change occurs
        try {
          const { images } = await getJobImages(jobId);
          console.log(`[UGC-GEMINI API] Refetched ${images.length} images for job ${jobId}`);
          onUpdate(images);
        } catch (error) {
          console.error('[UGC-GEMINI API] Failed to fetch updated images:', error);
        }
      }
    )
    .subscribe(async (status) => {
      console.log(`[UGC-GEMINI API] Images subscription status: ${status}`);
      if (status === 'SUBSCRIBED') {
        // Initial sync
        try {
          const { images } = await getJobImages(jobId);
          console.log(`[UGC-GEMINI API] Initial images sync: ${images.length} images`);
          onUpdate(images);
        } catch (error) {
          console.error('[UGC-GEMINI API] Failed to fetch initial images:', error);
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[UGC-GEMINI API] Images subscription error for ${jobId}`);
      }
    });

  return () => {
    console.log(`[UGC-GEMINI API] Cleaning up images subscription for job ${jobId}`);
    supabase.removeChannel(channel);
  };
}