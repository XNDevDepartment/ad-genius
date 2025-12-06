import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as geminiV3Api from '@/api/ugc-gemini-v3';
import { useToast } from '@/hooks/use-toast';

export interface GeminiV3ImageMeta {
  format?: string;
  orientation?: string;
  style?: string;
  timeOfDay?: string;
  highlight?: string;
  index?: number;
}

export interface GeminiV3UgcImageRow {
  id: string;
  job_id: string;
  user_id: string;
  storage_path: string;
  public_url: string;
  meta?: GeminiV3ImageMeta;
  created_at: string;
  prompt?: string;
  public_showcase?: boolean;
  source_image_id?: string;
  updated_at?: string;
}

function isGeminiV3UgcImageRow(obj: any): obj is GeminiV3UgcImageRow {
  return obj && typeof obj === 'object' && 'id' in obj && 'job_id' in obj && 'public_url' in obj;
}

function buildGeminiV3Placeholders(count: number, jobId: string): GeminiV3UgcImageRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `placeholder-v3-${jobId}-${index}`,
    job_id: jobId,
    user_id: '',
    storage_path: '',
    public_url: '',
    meta: { index },
    created_at: new Date().toISOString(),
    prompt: '',
    public_showcase: false,
    source_image_id: '',
    updated_at: new Date().toISOString()
  }));
}

function mergeGeminiV3ByIndex(placeholders: GeminiV3UgcImageRow[], incoming: GeminiV3UgcImageRow[]): GeminiV3UgcImageRow[] {
  const result = [...placeholders];
  
  incoming.forEach(newImage => {
    const index = (newImage.meta as any)?.index;
    if (typeof index === 'number' && index >= 0 && index < result.length) {
      result[index] = newImage;
    } else {
      const placeholderIndex = result.findIndex(img => !img.public_url);
      if (placeholderIndex !== -1) {
        result[placeholderIndex] = newImage;
      } else {
        result.push(newImage);
      }
    }
  });
  
  return result;
}

export const useGeminiV3ImageJob = () => {
  const [job, setJob] = useState<geminiV3Api.JobRow | null>(null);
  const [images, setImages] = useState<GeminiV3UgcImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const resumeAttemptsRef = useRef(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!job?.id) return;

    console.log(`[GEMINI-V3 JOB] Setting up subscriptions for job ${job.id}`);
    
    const jobUnsubscribe = geminiV3Api.subscribeJob(job.id, (updatedJob) => {
      if (!isMountedRef.current) return;
      
      console.log(`[GEMINI-V3 JOB] Job update:`, updatedJob);
      setJob(updatedJob);
      
      if (updatedJob.status === 'completed') {
        toast({
          title: "Gemini 3.0 Generation Complete!",
          description: `Successfully generated ${updatedJob.completed} images with Gemini 3.0.`,
        });
      } else if (updatedJob.status === 'failed') {
        setError(updatedJob.error || 'Generation failed');
        toast({
          title: "Gemini 3.0 Generation Failed",
          description: updatedJob.error || "Failed to generate images",
          variant: "destructive",
        });
      }
    });

    const imagesUnsubscribe = geminiV3Api.subscribeJobImages(job.id, (newImages) => {
      if (!isMountedRef.current) return;
      
      console.log(`[GEMINI-V3 JOB] Images update: ${newImages.length} images`);
      
      if (newImages.length === 0) return;
      
      setImages(currentImages => {
        const validImages = newImages.filter(isGeminiV3UgcImageRow);
        if (validImages.length === 0) return currentImages;
        
        if (currentImages.length > 0 && !currentImages[0].public_url) {
          return mergeGeminiV3ByIndex(currentImages, validImages);
        }
        
        return validImages;
      });
    });

    return () => {
      jobUnsubscribe();
      imagesUnsubscribe();
    };
  }, [job?.id, toast]);

  useEffect(() => {
    if (!job?.id || job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') {
      if (pollRef.current) {
        clearTimeout(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const poll = async () => {
      if (!isMountedRef.current) return;
      
      try {
        const [jobResult, imagesResult] = await Promise.all([
          geminiV3Api.getJob(job.id).catch(() => null),
          geminiV3Api.getJobImages(job.id).catch(() => null)
        ]);

        if (!isMountedRef.current) return;

        if (jobResult?.job) {
          setJob(jobResult.job);
        }

        if (imagesResult?.images) {
          setImages(currentImages => {
            const validImages = imagesResult.images.filter(isGeminiV3UgcImageRow);
            if (validImages.length === 0) return currentImages;
            
            if (currentImages.length > 0 && !currentImages[0].public_url) {
              return mergeGeminiV3ByIndex(currentImages, validImages);
            }
            
            return validImages;
          });
        }
      } catch (error) {
        console.error('[GEMINI-V3 JOB] Polling error:', error);
      }

      if (isMountedRef.current && (job.status === 'queued' || job.status === 'processing')) {
        pollRef.current = setTimeout(poll, 3000);
      }
    };

    pollRef.current = setTimeout(poll, 2000);

    return () => {
      if (pollRef.current) {
        clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [job?.id, job?.status]);

  useEffect(() => {
    if (!job || job.status !== 'queued') {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      resumeAttemptsRef.current = 0;
      return;
    }

    watchdogRef.current = setTimeout(async () => {
      if (!isMountedRef.current || !job || job.status !== 'queued') return;
      
      if (resumeAttemptsRef.current >= 2) {
        console.warn('[GEMINI-V3 JOB] Too many resume attempts, giving up');
        return;
      }

      console.log(`[GEMINI-V3 JOB] Job ${job.id} stuck in queued state, attempting resume...`);
      try {
        await geminiV3Api.resumeJob(job.id);
        resumeAttemptsRef.current++;
        toast({
          title: "Resuming Gemini 3.0 Generation",
          description: "Detected stuck job, attempting to resume...",
        });
      } catch (error) {
        console.error('[GEMINI-V3 JOB] Failed to resume job:', error);
      }
    }, 30000);

    return () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [job?.id, job?.status, toast]);

  const loadGeminiV3JobImages = async (jobId: string) => {
    try {
      const { images: fetchedImages } = await geminiV3Api.getJobImages(jobId);
      const validImages = fetchedImages.filter(isGeminiV3UgcImageRow);
      
      if (!isMountedRef.current) return;
      
      setImages(currentImages => {
        if (currentImages.length > 0 && !currentImages[0].public_url) {
          return mergeGeminiV3ByIndex(currentImages, validImages);
        }
        return validImages;
      });
    } catch (error) {
      console.error('[GEMINI-V3 JOB] Failed to load images:', error);
    }
  };

  const loadGeminiV3Job = async (jobId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { job: fetchedJob } = await geminiV3Api.getJob(jobId);
      
      if (!isMountedRef.current) return;
      
      setJob(fetchedJob);
      
      const metadata = {
        numImages: fetchedJob.total,
        jobId: fetchedJob.id,
        status: fetchedJob.status
      };
      localStorage.setItem('geminiV3JobMetadata', JSON.stringify(metadata));
      
      await loadGeminiV3JobImages(jobId);
      
    } catch (error) {
      console.error('[GEMINI-V3 JOB] Failed to load job:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to load job');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const createGeminiV3Job = async (payload: geminiV3Api.CreateJobPayload) => {
    try {
      setLoading(true);
      setError(null);
      resumeAttemptsRef.current = 0;
      
      console.log('[GEMINI-V3 JOB] Creating job with payload:', payload);
      
      const result = await geminiV3Api.createImageJob(payload);
      console.log('[GEMINI-V3 JOB] Job creation result:', result);
      
      if (!isMountedRef.current) return null;
      
      const placeholders = buildGeminiV3Placeholders(payload.settings.number, result.jobId);
      setImages(placeholders);
      
      localStorage.setItem('currentGeminiV3JobId', result.jobId);
      localStorage.setItem('currentGeminiV3Stage', 'generating');
      
      const metadata = {
        numImages: payload.settings.number,
        jobId: result.jobId,
        status: 'queued'
      };
      localStorage.setItem('geminiV3JobMetadata', JSON.stringify(metadata));
      
      await loadGeminiV3Job(result.jobId);
      
      return result;
    } catch (error) {
      console.error('[GEMINI-V3 JOB] Failed to create job:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to create job');
        toast({
          title: "Gemini 3.0 Generation Failed",
          description: error instanceof Error ? error.message : "Failed to start Gemini 3.0 generation",
          variant: "destructive",
        });
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const cancelCurrentGeminiV3Job = async () => {
    if (!job?.id) return;
    
    try {
      await geminiV3Api.cancelJob(job.id);
      toast({
        title: "Gemini 3.0 Generation Canceled",
        description: "Image generation has been canceled.",
      });
    } catch (error) {
      console.error('[GEMINI-V3 JOB] Failed to cancel job:', error);
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel generation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resumeCurrentGeminiV3Job = async () => {
    if (!job?.id) return;
    
    try {
      await geminiV3Api.resumeJob(job.id);
      toast({
        title: "Gemini 3.0 Generation Resumed",
        description: "Image generation has been resumed.",
      });
    } catch (error) {
      console.error('[GEMINI-V3 JOB] Failed to resume job:', error);
      toast({
        title: "Resume Failed",
        description: "Failed to resume generation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearGeminiV3Job = () => {
    setJob(null);
    setImages([]);
    setError(null);
    localStorage.removeItem('currentGeminiV3JobId');
    localStorage.removeItem('currentGeminiV3Stage');
    localStorage.removeItem('geminiV3JobMetadata');
    
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  };

  return {
    job,
    images,
    loading,
    error,
    createJob: createGeminiV3Job,
    loadJob: loadGeminiV3Job,
    loadJobImages: loadGeminiV3JobImages,
    cancelCurrentJob: cancelCurrentGeminiV3Job,
    resumeCurrentJob: resumeCurrentGeminiV3Job,
    clearJob: clearGeminiV3Job
  };
};
