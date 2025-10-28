import { supabase } from '@/integrations/supabase/client';

export type KlingJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';

export interface CreateVideoJobPayload {
  source_image_id?: string;
  ugc_image_id?: string;
  prompt: string;
  duration: 5 | 10;
  model?: string;
}

export interface KlingJobRow {
  id: string;
  user_id: string;
  status: KlingJobStatus;
  prompt: string;
  duration: number;
  model: string;
  image_url: string | null;
  image_path: string | null;
  video_url: string | null;
  video_path: string | null;
  request_id: string | null;
  source_image_id: string | null;
  ugc_image_id: string | null;
  video_duration: number | null;
  video_size_bytes: number | null;
  error: any;
  retry_count: number;
  metadata: any;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

async function callKlingFunction(action: string, payload: any = {}, maxRetries = 3): Promise<any> {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/kling-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action, ...payload }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      lastError = error;
      console.error(`[KLING-API] Attempt ${attempt + 1} failed:`, error);
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
}

export async function createVideoJob(payload: CreateVideoJobPayload): Promise<{
  success: boolean;
  jobId?: string;
  status?: string;
  error?: string;
  current_balance?: number;
  required?: number;
  upgrade_required?: boolean;
}> {
  const result = await callKlingFunction('createVideoJob', payload);
  
  if (result.upgrade_required) {
    return {
      success: false,
      error: result.error,
      upgrade_required: true
    };
  }
  
  return result;
}

export async function getVideoJob(jobId: string): Promise<{
  success: boolean;
  job?: KlingJobRow;
  error?: string;
}> {
  return callKlingFunction('getVideoJob', { jobId });
}

export async function cancelVideoJob(jobId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  return callKlingFunction('cancelVideoJob', { jobId });
}

export async function retryVideoJob(jobId: string): Promise<{
  success: boolean;
  message?: string;
  status?: string;
  error?: string;
}> {
  return callKlingFunction('retryVideoJob', { jobId });
}

export function subscribeVideoJob(
  jobId: string,
  onUpdate: (job: KlingJobRow) => void
): { unsubscribe: () => void } {
  console.log('[KLING-SUBSCRIBE] Setting up subscription for job:', jobId);

  // Initial fetch
  getVideoJob(jobId).then(result => {
    if (result.success && result.job) {
      onUpdate(result.job);
    }
  });

  // Subscribe to changes
  const channel = supabase
    .channel(`kling_job_${jobId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'kling_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        console.log('[KLING-SUBSCRIBE] Job update received:', payload);
        if (payload.new) {
          onUpdate(payload.new as KlingJobRow);
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      console.log('[KLING-SUBSCRIBE] Unsubscribing from job:', jobId);
      supabase.removeChannel(channel);
    },
  };
}
