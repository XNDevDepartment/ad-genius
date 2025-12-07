import { useState, useRef, useEffect } from 'react';
import { createGeminiApi, ModelVersion, CreateJobPayload, JobRow, UgcImageRow } from '@/api/ugc-gemini-unified';
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

function buildPlaceholders(count: number, jobId: string): GeminiUgcImageRow[] {
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

function mergeByIndex(placeholders: GeminiUgcImageRow[], incoming: GeminiUgcImageRow[]): GeminiUgcImageRow[] {
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

// Storage key prefixes based on model version
const getStorageKeys = (modelVersion: ModelVersion) => ({
  jobId: `current${modelVersion === 'gemini-v3' ? 'GeminiV3' : 'Gemini'}JobId`,
  stage: `current${modelVersion === 'gemini-v3' ? 'GeminiV3' : 'Gemini'}Stage`,
  metadata: `${modelVersion === 'gemini-v3' ? 'geminiV3' : 'gemini'}JobMetadata`
});

export const useGeminiImageJobUnified = (modelVersion: ModelVersion) => {
  const api = createGeminiApi(modelVersion);
  const storageKeys = getStorageKeys(modelVersion);
  
  const [job, setJob] = useState<JobRow | null>(null);
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

    console.log(`[${modelVersion.toUpperCase()} JOB] Setting up subscriptions for job ${job.id}`);
    
    const jobUnsubscribe = api.subscribeJob(job.id, (updatedJob) => {
      if (!isMountedRef.current) return;
      
      console.log(`[${modelVersion.toUpperCase()} JOB] Job update:`, updatedJob);
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

    const imagesUnsubscribe = api.subscribeJobImages(job.id, (newImages) => {
      if (!isMountedRef.current) return;
      
      console.log(`[${modelVersion.toUpperCase()} JOB] Images update: ${newImages.length} images`);
      
      if (newImages.length === 0) return;
      
      setImages(currentImages => {
        const validImages = newImages.filter(isGeminiUgcImageRow);
        if (validImages.length === 0) return currentImages;
        
        if (currentImages.length > 0 && !currentImages[0].public_url) {
          return mergeByIndex(currentImages, validImages);
        }
        
        return validImages;
      });
    });

    return () => {
      jobUnsubscribe();
      imagesUnsubscribe();
    };
  }, [job?.id, toast, modelVersion]);

  // Polling fallback
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
          api.getJob(job.id).catch(() => null),
          api.getJobImages(job.id).catch(() => null)
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
              return mergeByIndex(currentImages, validImages);
            }
            
            return validImages;
          });
        }
      } catch (error) {
        console.error(`[${modelVersion.toUpperCase()} JOB] Polling error:`, error);
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
  }, [job?.id, job?.status, modelVersion]);

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
        console.warn(`[${modelVersion.toUpperCase()} JOB] Too many resume attempts, giving up`);
        return;
      }

      console.log(`[${modelVersion.toUpperCase()} JOB] Job ${job.id} stuck in queued state, attempting resume...`);
      try {
        await api.resumeJob(job.id);
        resumeAttemptsRef.current++;
        toast({
          title: "Resuming Generation",
          description: "Detected stuck job, attempting to resume...",
        });
      } catch (error) {
        console.error(`[${modelVersion.toUpperCase()} JOB] Failed to resume job:`, error);
      }
    }, 30000);

    return () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [job?.id, job?.status, toast, modelVersion]);

  const loadJobImages = async (jobId: string) => {
    try {
      const { images: fetchedImages } = await api.getJobImages(jobId);
      const validImages = fetchedImages.filter(isGeminiUgcImageRow);
      
      if (!isMountedRef.current) return;
      
      setImages(currentImages => {
        if (currentImages.length > 0 && !currentImages[0].public_url) {
          return mergeByIndex(currentImages, validImages);
        }
        return validImages;
      });
    } catch (error) {
      console.error(`[${modelVersion.toUpperCase()} JOB] Failed to load images:`, error);
    }
  };

  const loadJob = async (jobId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { job: fetchedJob } = await api.getJob(jobId);
      
      if (!isMountedRef.current) return;
      
      setJob(fetchedJob);
      
      const metadata = {
        numImages: fetchedJob.total,
        jobId: fetchedJob.id,
        status: fetchedJob.status
      };
      localStorage.setItem(storageKeys.metadata, JSON.stringify(metadata));
      
      await loadJobImages(jobId);
      
    } catch (error) {
      console.error(`[${modelVersion.toUpperCase()} JOB] Failed to load job:`, error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to load job');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const createJob = async (payload: CreateJobPayload) => {
    try {
      setLoading(true);
      setError(null);
      resumeAttemptsRef.current = 0;
      
      console.log(`[${modelVersion.toUpperCase()} JOB] Creating job with payload:`, payload);
      
      const result = await api.createImageJob(payload);
      console.log(`[${modelVersion.toUpperCase()} JOB] Job creation result:`, result);
      
      if (!isMountedRef.current) return null;
      
      const placeholders = buildPlaceholders(payload.settings.number, result.jobId);
      setImages(placeholders);
      
      localStorage.setItem(storageKeys.jobId, result.jobId);
      localStorage.setItem(storageKeys.stage, 'generating');
      
      const metadata = {
        numImages: payload.settings.number,
        jobId: result.jobId,
        status: 'queued'
      };
      localStorage.setItem(storageKeys.metadata, JSON.stringify(metadata));
      
      await loadJob(result.jobId);
      
      return result;
    } catch (error) {
      console.error(`[${modelVersion.toUpperCase()} JOB] Failed to create job:`, error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to create job');
        toast({
          title: "Generation Failed",
          description: error instanceof Error ? error.message : "Failed to start generation",
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

  const cancelCurrentJob = async () => {
    if (!job?.id) return;
    
    try {
      await api.cancelJob(job.id);
      toast({
        title: "Generation Canceled",
        description: "Image generation has been canceled.",
      });
    } catch (error) {
      console.error(`[${modelVersion.toUpperCase()} JOB] Failed to cancel job:`, error);
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel generation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resumeCurrentJob = async () => {
    if (!job?.id) return;
    
    try {
      await api.resumeJob(job.id);
      toast({
        title: "Generation Resumed",
        description: "Image generation has been resumed.",
      });
    } catch (error) {
      console.error(`[${modelVersion.toUpperCase()} JOB] Failed to resume job:`, error);
      toast({
        title: "Resume Failed",
        description: "Failed to resume generation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearJob = () => {
    setJob(null);
    setImages([]);
    setError(null);
    localStorage.removeItem(storageKeys.jobId);
    localStorage.removeItem(storageKeys.stage);
    localStorage.removeItem(storageKeys.metadata);
    
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
    createJob,
    loadJob,
    loadJobImages,
    cancelCurrentJob,
    resumeCurrentJob,
    clearJob,
    modelVersion,
    storageKeys
  };
};
