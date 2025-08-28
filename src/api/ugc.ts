import { supabase } from '@/integrations/supabase/client';

export type ImageJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';

export type CreateJobPayload = {
  prompt: string;
  settings: {
    number: number;
    size: '1024x1024' | '1536x1024' | '1024x1536';
    quality: 'standard' | 'hd';
    orientation?: '1:1' | '3:2' | '2:3';
    style?: 'lifestyle' | 'minimal' | 'vibrant' | 'professional';
    timeOfDay?: 'natural' | 'golden' | 'night';
    highlight?: boolean;
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
};

async function callUgcFunction(action: string, payload: any = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/ugc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
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
  return callUgcFunction('generateImages', { jobId });
}

export function subscribeJob(
  jobId: string, 
  onUpdate: (job: JobRow) => void
): () => void {
  const channel = supabase
    .channel(`job-${jobId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'image_jobs',
      filter: `id=eq.${jobId}`
    }, (payload) => {
      if (payload.new) {
        onUpdate(payload.new as JobRow);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}