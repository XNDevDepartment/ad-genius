import { supabase } from '@/integrations/supabase/client';

export type BulkBackgroundJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';

export interface BulkBackgroundJob {
  id: string;
  user_id: string;
  status: BulkBackgroundJobStatus;
  background_type: 'preset' | 'custom';
  background_preset_id?: string;
  background_image_url?: string;
  total_images: number;
  completed_images: number;
  failed_images: number;
  progress: number;
  settings: Record<string, unknown>;
  error?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface BulkBackgroundResult {
  id: string;
  job_id: string;
  user_id: string;
  source_image_id?: string;
  source_image_url: string;
  result_url?: string;
  storage_path?: string;
  detailed_result_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  image_index: number;
  processing_time_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBulkJobPayload {
  sourceImageIds: string[];
  backgroundType: 'preset' | 'custom';
  backgroundPresetId?: string;
  backgroundImageUrl?: string;
  settings?: {
    outputFormat?: 'png' | 'webp';
    quality?: 'high' | 'medium';
    customPrompt?: string;
    imageSize?: string;
    aspectRatio?: string;
  };
}

const ENDPOINT = 'https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/bulk-background';

async function callFunction(action: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const bulkBackgroundApi = {
  async createJob(payload: CreateBulkJobPayload): Promise<{ jobId: string }> {
    return callFunction('createJob', payload as unknown as Record<string, unknown>) as Promise<{ jobId: string }>;
  },

  async getJob(jobId: string): Promise<{ job: BulkBackgroundJob }> {
    return callFunction('getJob', { jobId }) as Promise<{ job: BulkBackgroundJob }>;
  },

  async getJobResults(jobId: string): Promise<{ results: BulkBackgroundResult[] }> {
    return callFunction('getJobResults', { jobId }) as Promise<{ results: BulkBackgroundResult[] }>;
  },

  async cancelJob(jobId: string): Promise<{ success: boolean; refunded?: number }> {
    return callFunction('cancelJob', { jobId }) as Promise<{ success: boolean; refunded?: number }>;
  },

  async getDownloadImages(jobId: string): Promise<{ images: { url: string; index: number }[] }> {
    return callFunction('downloadAll', { jobId }) as Promise<{ images: { url: string; index: number }[] }>;
  },

  async retryResult(resultId: string): Promise<{ success: boolean; error?: string }> {
    return callFunction('retryResult', { resultId }) as Promise<{ success: boolean; error?: string }>;
  },

  async generateDetailedImage(resultId: string): Promise<{ detailedUrl: string }> {
    return callFunction('generateDetailedImage', { resultId }) as Promise<{ detailedUrl: string }>;
  },

  subscribeJob(jobId: string, onUpdate: (job: BulkBackgroundJob) => void) {
    const channel = supabase
      .channel(`bulk-bg-job:${jobId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bulk_background_jobs',
        filter: `id=eq.${jobId}`
      }, (payload) => {
        onUpdate(payload.new as BulkBackgroundJob);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeResults(jobId: string, onUpdate: (results: BulkBackgroundResult[]) => void) {
    const self = this;
    const channel = supabase
      .channel(`bulk-bg-results:${jobId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bulk_background_results',
        filter: `job_id=eq.${jobId}`
      }, async () => {
        try {
          const { results } = await self.getJobResults(jobId);
          onUpdate(results);
        } catch (e) {
          console.error('Failed to fetch results on update:', e);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
