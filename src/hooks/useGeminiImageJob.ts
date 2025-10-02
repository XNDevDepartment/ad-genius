import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as geminiApi from '@/api/ugc-gemini';
import { useToast } from '@/hooks/use-toast';

export interface GeminiImageMeta {
  format?: string;
  orientation?: string;
  style?: string;
  timeOfDay?: string;
  highlight?: string;
  index?: number;
}

export interface GeminiUgcImageRow {
  id: string;
  job_id: string;
  user_id: string;
  storage_path: string;
  public_url: string;
  meta?: GeminiImageMeta;
  created_at: string;
  prompt?: string;
  public_showcase?: boolean;
  source_image_id?: string;
  updated_at?: string;
}

function isGeminiUgcImageRow(obj: any): obj is GeminiUgcImageRow {
  return obj && typeof obj === 'object' && 'id' in obj && 'job_id' in obj && 'public_url' in obj;
}

function buildGeminiPlaceholders(count: number, jobId: string): GeminiUgcImageRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `placeholder-${jobId}-${index}`,
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

function mergeGeminiByIndex(placeholders: GeminiUgcImageRow[], incoming: GeminiUgcImageRow[]): GeminiUgcImageRow[] {
  const result = [...placeholders];
  
  incoming.forEach(newImage => {
    const index = (newImage.meta as any)?.index;
    if (typeof index === 'number' && index >= 0 && index < result.length) {
      result[index] = newImage;
    } else {
      // If no index, find first available placeholder slot
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

export const useGeminiImageJob = () => {
  const [job, setJob] = useState<geminiApi.JobRow | null>(null);
  const [images, setImages] = useState<GeminiUgcImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const resumeAttemptsRef = useRef(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  // Subscribe to job updates
  useEffect(() => {
    if (!job?.id) return;

    console.log(`[GEMINI JOB] Setting up subscriptions for job ${job.id}`);
    
    const jobUnsubscribe = geminiApi.subscribeJob(job.id, (updatedJob) => {
      if (!isMountedRef.current) return;
      
      console.log(`[GEMINI JOB] Job update:`, updatedJob);
      setJob(updatedJob);
      
      if (updatedJob.status === 'completed') {
        toast({
          title: "Generation Complete!",
          description: `Successfully generated ${updatedJob.completed} images.`,
        });
      } else if (updatedJob.status === 'failed') {
        setError(updatedJob.error || 'Generation failed');
        toast({
          title: "Generation Failed",
          description: updatedJob.error || "Failed to generate images",
          variant: "destructive",
        });
      }
    });

    const imagesUnsubscribe = geminiApi.subscribeJobImages(job.id, (newImages) => {
      if (!isMountedRef.current) return;
      
      console.log(`[GEMINI JOB] Images update: ${newImages.length} images`);
      
      if (newImages.length === 0) return;
      
      setImages(currentImages => {
        const validImages = newImages.filter(isGeminiUgcImageRow);
        if (validImages.length === 0) return currentImages;
        
        // If we have placeholders, merge by index
        if (currentImages.length > 0 && !currentImages[0].public_url) {
          return mergeGeminiByIndex(currentImages, validImages);
        }
        
        return validImages;
      });
    });

    return () => {
      jobUnsubscribe();
      imagesUnsubscribe();
    };
  }, [job?.id, toast]);

  // Real-time updates fallback with polling
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
          geminiApi.getJob(job.id).catch(() => null),
          geminiApi.getJobImages(job.id).catch(() => null)
        ]);

        if (!isMountedRef.current) return;

        if (jobResult?.job) {
          setJob(jobResult.job);
        }

        if (imagesResult?.images) {
          setImages(currentImages => {
            const validImages = imagesResult.images.filter(isGeminiUgcImageRow);
            if (validImages.length === 0) return currentImages;
            
            if (currentImages.length > 0 && !currentImages[0].public_url) {
              return mergeGeminiByIndex(currentImages, validImages);
            }
            
            return validImages;
          });
        }
      } catch (error) {
        console.error('[GEMINI JOB] Polling error:', error);
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

  // Watchdog for stuck jobs
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
        console.warn('[GEMINI JOB] Too many resume attempts, giving up');
        return;
      }

      console.log(`[GEMINI JOB] Job ${job.id} stuck in queued state, attempting resume...`);
      try {
        await geminiApi.resumeJob(job.id);
        resumeAttemptsRef.current++;
        toast({
          title: "Resuming Generation",
          description: "Detected stuck job, attempting to resume...",
        });
      } catch (error) {
        console.error('[GEMINI JOB] Failed to resume job:', error);
      }
    }, 30000);

    return () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [job?.id, job?.status, toast]);

  const loadGeminiJobImages = async (jobId: string) => {
    try {
      const { images: fetchedImages } = await geminiApi.getJobImages(jobId);
      const validImages = fetchedImages.filter(isGeminiUgcImageRow);
      
      if (!isMountedRef.current) return;
      
      setImages(currentImages => {
        if (currentImages.length > 0 && !currentImages[0].public_url) {
          return mergeGeminiByIndex(currentImages, validImages);
        }
        return validImages;
      });
    } catch (error) {
      console.error('[GEMINI JOB] Failed to load images:', error);
    }
  };

  const loadGeminiJob = async (jobId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { job: fetchedJob } = await geminiApi.getJob(jobId);
      
      if (!isMountedRef.current) return;
      
      setJob(fetchedJob);
      
      // Store metadata for mobile recovery
      const metadata = {
        numImages: fetchedJob.total,
        jobId: fetchedJob.id,
        status: fetchedJob.status
      };
      localStorage.setItem('geminiJobMetadata', JSON.stringify(metadata));
      
      await loadGeminiJobImages(jobId);
      
    } catch (error) {
      console.error('[GEMINI JOB] Failed to load job:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to load job');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const createGeminiJob = async (payload: geminiApi.CreateJobPayload) => {
    try {
      setLoading(true);
      setError(null);
      resumeAttemptsRef.current = 0;
      
      console.log('[GEMINI JOB] Creating job with payload:', payload);
      
      const result = await geminiApi.createImageJob(payload);
      console.log('[GEMINI JOB] Job creation result:', result);
      
      if (!isMountedRef.current) return null;
      
      // Create placeholders immediately
      const placeholders = buildGeminiPlaceholders(payload.settings.number, result.jobId);
      setImages(placeholders);
      
      // Store job ID for recovery
      localStorage.setItem('currentGeminiJobId', result.jobId);
      localStorage.setItem('currentGeminiStage', 'generating');
      
      const metadata = {
        numImages: payload.settings.number,
        jobId: result.jobId,
        status: 'queued'
      };
      localStorage.setItem('geminiJobMetadata', JSON.stringify(metadata));
      
      // Load the full job data
      await loadGeminiJob(result.jobId);
      
      return result;
    } catch (error) {
      console.error('[GEMINI JOB] Failed to create job:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to create job');
        toast({
          title: "Generation Failed",
          description: error instanceof Error ? error.message : "Failed to start Gemini generation",
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

  const cancelCurrentGeminiJob = async () => {
    if (!job?.id) return;
    
    try {
      await geminiApi.cancelJob(job.id);
      toast({
        title: "Generation Canceled",
        description: "Gemini image generation has been canceled.",
      });
    } catch (error) {
      console.error('[GEMINI JOB] Failed to cancel job:', error);
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel generation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resumeCurrentGeminiJob = async () => {
    if (!job?.id) return;
    
    try {
      await geminiApi.resumeJob(job.id);
      toast({
        title: "Generation Resumed",
        description: "Gemini image generation has been resumed.",
      });
    } catch (error) {
      console.error('[GEMINI JOB] Failed to resume job:', error);
      toast({
        title: "Resume Failed",
        description: "Failed to resume generation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearGeminiJob = () => {
    setJob(null);
    setImages([]);
    setError(null);
    localStorage.removeItem('currentGeminiJobId');
    localStorage.removeItem('currentGeminiStage');
    localStorage.removeItem('geminiJobMetadata');
    
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
    createJob: createGeminiJob,
    loadJob: loadGeminiJob,
    loadJobImages: loadGeminiJobImages,
    cancelCurrentJob: cancelCurrentGeminiJob,
    resumeCurrentJob: resumeCurrentGeminiJob,
    clearJob: clearGeminiJob
  };
};