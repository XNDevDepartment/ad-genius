import { supabase } from '@/integrations/supabase/client';

export type ImageJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';

export type CreateJobPayload = {
  prompt: string;
  settings: {
    number: number;
    size: '1024x1024' | '1536x1024' | '1024x1536';
    quality: 'low' | 'medium' | 'high';
    orientation?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
    style?: 'lifestyle' | 'minimal' | 'vibrant' | 'professional' | 'cinematic' | 'natural';
    timeOfDay?: 'natural' | 'golden' | 'night';
    highlight?: 'yes' | 'no';
    output_format?: 'png' | 'webp';
  };
  source_image_id?: string;
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
};

export type UgcImageRow = {
  id: string;
  job_id: string;
  user_id: string;
  storage_path: string;
  public_url: string;
  meta?: any;
  created_at: string;
  prompt: string,
  public_showcase: boolean,
  source_image_id: string,
  updated_at: string
};

async function callUgcFunction(action: string, payload: any = {}, maxRetries = 3) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Set timeout based on action type - no timeout for job creation
  const timeout = action === 'createImageJob' ? null : 30000; // No timeout for job creation, 30s for others
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[UGC API] ${action} - Attempt ${attempt}/${maxRetries}`, payload);
      
      const controller = new AbortController();
      const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

      const response = await fetch(`https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/ugc`, {
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
        console.error(`[UGC API] ${action} failed:`, { status: response.status, error, attempt });
        
        // Retry on server errors or timeouts, but not on auth/client errors
        if (attempt < maxRetries && (response.status >= 500 || response.status === 408)) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff up to 5s
          console.log(`[UGC API] Retrying ${action} in ${delay}ms...`);
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

      console.log(`[UGC API] ${action} succeeded on attempt ${attempt}`, data);
      return data;
    } catch (error: any) {
      console.error(`[UGC API] ${action} error on attempt ${attempt}:`, error);
      
      // Don't retry on abort/timeout or non-retryable errors
      if (error.name === 'AbortError') {
        throw new Error(timeout ? `Request timeout after ${timeout/1000}s` : 'Request was aborted');
      }
      
      if (attempt === maxRetries || error.message.includes('Authentication failed')) {
        throw error;
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`[UGC API] Retrying ${action} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts`);
}

export async function createImageJob(payload: CreateJobPayload): Promise<{jobId: string, status?: string, existingImages?: any[]}> {
  return callUgcFunction('createImageJob', payload);
}

export async function getJob(jobId: string): Promise<{job: JobRow}> {
  return callUgcFunction('getJob', { jobId });
}

export async function getJobImages(jobId: string): Promise<{images: UgcImageRow[]}> {
  return callUgcFunction('getJobImages', { jobId });
}

export async function cancelJob(jobId: string): Promise<{success: boolean}> {
  return callUgcFunction('cancelJob', { jobId });
}

export async function resumeJob(jobId: string): Promise<{success: boolean}> {
  return callUgcFunction('resumeJob', { jobId });
}

export async function getActiveJobForUser(): Promise<{job: JobRow | null}> {
  return callUgcFunction('getActiveJob');
}

export function subscribeJob(jobId: string, onUpdate: (row: any) => void) {
  console.log(`[UGC API] Setting up job subscription for ${jobId}`);
  
  const channel = supabase
    .channel(`image-job:${jobId}`)
    .on(
      'postgres_changes',
      { event: '*',
        schema: 'public',
        table: 'image_jobs',
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        console.log(`[UGC API] Job update received:`, payload);
        const row = (payload as any).new ?? (payload as any).record ?? null;
        if (row) onUpdate(row);
      }
    )
    .subscribe(async (status) => {
      console.log(`[UGC API] Job subscription status: ${status}`);
      if (status === 'SUBSCRIBED') {
        try {
          const { data, error } = await supabase.from('image_jobs').select('*').eq('id', jobId).maybeSingle();
          if (error) {
            console.error(`[UGC API] Failed to fetch initial job data:`, error);
          } else if (data) {
            console.log(`[UGC API] Initial job sync:`, data);
            onUpdate(data as JobRow);
          }
        } catch (error) {
          console.error(`[UGC API] Error in initial job sync:`, error);
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[UGC API] Job subscription error for ${jobId}`);
      }
    });

  return () => {
    console.log(`[UGC API] Cleaning up job subscription for ${jobId}`);
    supabase.removeChannel(channel);
  };
}

export function subscribeJobImages(jobId: string, onUpdate: (images: UgcImageRow[]) => void) {
  console.log(`[UGC API] Setting up images subscription for job ${jobId}`);
  
  const channel = supabase
    .channel(`job-images:${jobId}`)
    .on(
      'postgres_changes',
      { event: '*',
        schema: 'public',
        table: 'ugc_images',
        filter: `job_id=eq.${jobId}`
      },
      async (payload) => {
        console.log(`[UGC API] Images update received:`, payload);
        // Refetch all images for this job when any change occurs
        try {
          const { images } = await getJobImages(jobId);
          console.log(`[UGC API] Refetched ${images.length} images for job ${jobId}`);
          onUpdate(images);
        } catch (error) {
          console.error('[UGC API] Failed to fetch updated images:', error);
        }
      }
    )
    .subscribe(async (status) => {
      console.log(`[UGC API] Images subscription status: ${status}`);
      if (status === 'SUBSCRIBED') {
        // Initial sync
        try {
          const { images } = await getJobImages(jobId);
          console.log(`[UGC API] Initial images sync: ${images.length} images`);
          onUpdate(images);
        } catch (error) {
          console.error('[UGC API] Failed to fetch initial images:', error);
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[UGC API] Images subscription error for job ${jobId}`);
      }
    });

  return () => {
    console.log(`[UGC API] Cleaning up images subscription for job ${jobId}`);
    supabase.removeChannel(channel);
  };
}