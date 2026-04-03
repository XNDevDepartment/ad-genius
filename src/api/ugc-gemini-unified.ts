import { supabase } from '@/integrations/supabase/client';

// Model version types
export type ModelVersion = 'gemini' | 'gemini-v3';

export type ImageJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';

export type CreateJobPayload = {
  prompt: string;
  settings: {
    number: number;
    size?: string;
    imageSize?: string;
    quality: 'low' | 'medium' | 'high';
    orientation?: string;
    aspectRatio?: string;
    style?: 'lifestyle' | 'minimal' | 'vibrant' | 'professional' | 'cinematic' | 'natural';
    timeOfDay?: 'natural' | 'golden' | 'night' | 'morning';
    highlight?: 'yes' | 'no';
    output_format?: 'png' | 'webp';
  };
  source_image_id?: string;
  source_image_ids?: string[];
  guidelineImageIds?: string[];
  desiredAudience?: string;
  prodSpecs?: string;
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
  model_type: ModelVersion;
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

// Endpoint mapping based on model version
const ENDPOINTS: Record<ModelVersion, string> = {
  'gemini': 'ugc-gemini',
  'gemini-v3': 'ugc-gemini-v3'
};

// Factory function to create API for a specific model version
export function createGeminiApi(modelVersion: ModelVersion) {
  const endpoint = ENDPOINTS[modelVersion];
  const baseUrl = `https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/${endpoint}`;

  async function callFunction(action: string, payload: any = {}, maxRetries = 3) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const timeout = action === 'createImageJob' ? null : 30000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[UGC-${modelVersion.toUpperCase()} API] ${action} - Attempt ${attempt}/${maxRetries}`, payload);
        
        const controller = new AbortController();
        const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

        const response = await fetch(baseUrl, {
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
          console.error(`[UGC-${modelVersion.toUpperCase()} API] ${action} failed:`, { status: response.status, error, attempt });
          
          if (attempt < maxRetries && (response.status >= 500 || response.status === 408)) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`[UGC-${modelVersion.toUpperCase()} API] Retrying ${action} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          if (response.status === 404) {
            throw new Error(`${error} (Job may not exist or may have been processed already)`);
          } else if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication failed: ${error}`);
          }
          
          throw new Error(error);
        }

        console.log(`[UGC-${modelVersion.toUpperCase()} API] ${action} succeeded on attempt ${attempt}`, data);
        return data;
      } catch (error: any) {
        console.error(`[UGC-${modelVersion.toUpperCase()} API] ${action} error on attempt ${attempt}:`, error);
        
        if (error.name === 'AbortError') {
          throw new Error(timeout ? `Request timeout after ${timeout/1000}s` : 'Request was aborted');
        }
        
        if (attempt === maxRetries || error.message.includes('Authentication failed')) {
          throw error;
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[UGC-${modelVersion.toUpperCase()} API] Retrying ${action} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`Failed after ${maxRetries} attempts`);
  }

  return {
    modelVersion,
    
    async createImageJob(payload: CreateJobPayload): Promise<{jobId: string, status?: string, existingImages?: any[]}> {
      return callFunction('createImageJob', payload);
    },

    async getJob(jobId: string): Promise<{job: JobRow}> {
      return callFunction('getJob', { jobId });
    },

    async getJobImages(jobId: string): Promise<{images: UgcImageRow[]}> {
      return callFunction('getJobImages', { jobId });
    },

    async cancelJob(jobId: string): Promise<{success: boolean}> {
      return callFunction('cancelJob', { jobId });
    },

    async resumeJob(jobId: string): Promise<{success: boolean}> {
      return callFunction('resumeJob', { jobId });
    },

    async getActiveJobForUser(): Promise<{job: JobRow | null}> {
      return callFunction('getActiveJob');
    },

    subscribeJob(jobId: string, onUpdate: (row: any) => void) {
      console.log(`[UGC-${modelVersion.toUpperCase()} API] Setting up job subscription for ${jobId}`);
      
      const channel = supabase
        .channel(`${modelVersion}-image-job:${jobId}`)
        .on(
          'postgres_changes',
          { event: '*',
            schema: 'public',
            table: 'image_jobs',
            filter: `id=eq.${jobId}`
          },
          (payload) => {
            console.log(`[UGC-${modelVersion.toUpperCase()} API] Job update received:`, payload);
            const row = (payload as any).new ?? (payload as any).record ?? null;
            if (row && row.model_type === modelVersion) onUpdate(row);
          }
        )
        .subscribe(async (status) => {
          console.log(`[UGC-${modelVersion.toUpperCase()} API] Job subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            try {
              const { data, error } = await supabase
                .from('image_jobs')
                .select('*')
                .eq('id', jobId)
                .eq('model_type', modelVersion)
                .maybeSingle();
              if (error) {
                console.error(`[UGC-${modelVersion.toUpperCase()} API] Failed to fetch initial job data:`, error);
              } else if (data) {
                console.log(`[UGC-${modelVersion.toUpperCase()} API] Initial job sync:`, data);
                onUpdate(data as JobRow);
              }
            } catch (error) {
              console.error(`[UGC-${modelVersion.toUpperCase()} API] Error in initial job sync:`, error);
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[UGC-${modelVersion.toUpperCase()} API] Job subscription error for ${jobId}`);
          }
        });

      return () => {
        console.log(`[UGC-${modelVersion.toUpperCase()} API] Cleaning up job subscription for ${jobId}`);
        supabase.removeChannel(channel);
      };
    },

    subscribeJobImages(jobId: string, onUpdate: (images: UgcImageRow[]) => void) {
      console.log(`[UGC-${modelVersion.toUpperCase()} API] Setting up images subscription for job ${jobId}`);
      
      const channel = supabase
        .channel(`${modelVersion}-job-images:${jobId}`)
        .on(
          'postgres_changes',
          { event: '*',
            schema: 'public',
            table: 'ugc_images',
            filter: `job_id=eq.${jobId}`
          },
          async (payload) => {
            console.log(`[UGC-${modelVersion.toUpperCase()} API] Images update received:`, payload);
            try {
              const result = await this.getJobImages(jobId);
              console.log(`[UGC-${modelVersion.toUpperCase()} API] Refetched ${result.images.length} images for job ${jobId}`);
              onUpdate(result.images);
            } catch (error) {
              console.error(`[UGC-${modelVersion.toUpperCase()} API] Failed to fetch updated images:`, error);
            }
          }
        )
        .subscribe(async (status) => {
          console.log(`[UGC-${modelVersion.toUpperCase()} API] Images subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            try {
              const result = await this.getJobImages(jobId);
              console.log(`[UGC-${modelVersion.toUpperCase()} API] Initial images sync: ${result.images.length} images`);
              onUpdate(result.images);
            } catch (error) {
              console.error(`[UGC-${modelVersion.toUpperCase()} API] Failed to fetch initial images:`, error);
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[UGC-${modelVersion.toUpperCase()} API] Images subscription error for ${jobId}`);
          }
        });

      return () => {
        console.log(`[UGC-${modelVersion.toUpperCase()} API] Cleaning up images subscription for job ${jobId}`);
        supabase.removeChannel(channel);
      };
    }
  };
}

// Pre-created instances for convenience
export const geminiApi = createGeminiApi('gemini');
export const geminiV3Api = createGeminiApi('gemini-v3');
