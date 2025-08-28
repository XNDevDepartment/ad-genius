import { useState, useEffect, useCallback } from 'react';
import { 
  createImageJob, 
  getJob, 
  getJobImages, 
  cancelJob, 
  subscribeJob,
  type CreateJobPayload,
  type JobRow,
  type UgcImageRow 
} from '@/api/ugc';
import { toast } from 'sonner';

interface UseImageJobReturn {
  job: JobRow | null;
  images: UgcImageRow[];
  loading: boolean;
  error: string | null;
  createJob: (payload: CreateJobPayload) => Promise<string>;
  loadJob: (jobId: string) => Promise<void>;
  cancelCurrentJob: () => Promise<void>;
  clearJob: () => void;
}

export function useImageJob(): UseImageJobReturn {
  const [job, setJob] = useState<JobRow | null>(null);
  const [images, setImages] = useState<UgcImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to job updates when job is set
  useEffect(() => {
    if (!job?.id) return;

    const unsubscribe = subscribeJob(job.id, (updatedJob: JobRow) => {
      setJob(updatedJob);
      
      // Load images when job completes
      if (updatedJob.status === 'completed' && updatedJob.completed > 0) {
        loadJobImages(updatedJob.id);
      }
      
      // Show error toast if job fails
      if (updatedJob.status === 'failed') {
        toast.error(`Image generation failed: ${updatedJob.error || 'Unknown error'}`);
      }
    });

    return unsubscribe;
  }, [job?.id]);

  const loadJobImages = async (jobId: string) => {
    try {
      const { images: jobImages } = await getJobImages(jobId);
      setImages(jobImages);
    } catch (err) {
      console.error('Failed to load job images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load images');
    }
  };

  const createJob = useCallback(async (payload: CreateJobPayload): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await createImageJob(payload);
      
      // If job was already completed, handle existing images
      if (result.status === 'completed' && result.existingImages) {
        // Create a mock job for display purposes
        const mockJob: JobRow = {
          id: result.jobId,
          user_id: 'current',
          status: 'completed',
          progress: 100,
          total: result.existingImages.length,
          completed: result.existingImages.length,
          failed: 0,
          prompt: payload.prompt,
          settings: payload.settings,
          created_at: new Date().toISOString(),
          finished_at: new Date().toISOString()
        };
        
        setJob(mockJob);
        
        // Convert existing images to UgcImageRow format
        const ugcImages: UgcImageRow[] = result.existingImages.map((img: any, index: number) => ({
          id: `existing-${index}`,
          job_id: result.jobId,
          user_id: 'current',
          storage_path: '',
          public_url: img.url,
          meta: { prompt: img.prompt },
          created_at: new Date().toISOString()
        }));
        
        setImages(ugcImages);
        toast.success('Using existing images from recent identical request');
      } else {
        // Load the new job
        await loadJob(result.jobId);
        toast.success('Image generation started');
      }
      
      return result.jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create job';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadJob = useCallback(async (jobId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { job: jobData } = await getJob(jobId);
      setJob(jobData);
      
      // Load images if job is completed
      if (jobData.status === 'completed' && jobData.completed > 0) {
        await loadJobImages(jobId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load job';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelCurrentJob = useCallback(async () => {
    if (!job?.id) return;
    
    try {
      await cancelJob(job.id);
      toast.success('Job canceled successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel job';
      toast.error(message);
    }
  }, [job?.id]);

  const clearJob = useCallback(() => {
    setJob(null);
    setImages([]);
    setError(null);
  }, []);

  return {
    job,
    images,
    loading,
    error,
    createJob,
    loadJob,
    cancelCurrentJob,
    clearJob
  };
}