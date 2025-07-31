import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GenerationJob {
  id: string;
  user_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  prompt: string;
  settings: any;
  progress: number;
  total_images: number;
  generated_images_count: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface GeneratedImageWithJob {
  id: string;
  url: string;
  prompt: string;
  settings: any;
  created_at: string;
  job_id: string;
}

export const useGenerationJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [pendingImages, setPendingImages] = useState<GeneratedImageWithJob[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs((data || []) as GenerationJob[]);
    } catch (error) {
      console.error('Error loading generation jobs:', error);
      toast.error('Failed to load generation jobs');
    }
  };

  const loadPendingImages = async () => {
    if (!user) return;

    try {
      // Get completed jobs with their generated images
      const { data, error } = await supabase
        .from('generation_jobs')
        .select(`
          id,
          prompt,
          settings,
          completed_at,
          generated_images_jobs!inner(
            generated_images!inner(
              id,
              public_url,
              created_at
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Flatten the data structure
      const images: GeneratedImageWithJob[] = [];
      data?.forEach(job => {
        job.generated_images_jobs.forEach((imageJob: any) => {
          images.push({
            id: imageJob.generated_images.id,
            url: imageJob.generated_images.public_url,
            prompt: job.prompt,
            settings: job.settings,
            created_at: imageJob.generated_images.created_at,
            job_id: job.id,
          });
        });
      });

      setPendingImages(images);
    } catch (error) {
      console.error('Error loading pending images:', error);
    }
  };

  const createGenerationJob = async (prompt: string, settings: any = {}) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('generation_jobs')
        .insert({
          user_id: user.id,
          prompt,
          settings,
          total_images: settings.numberOfImages || 1,
        })
        .select()
        .single();

      if (error) throw error;

      // Start background processing
      await supabase.functions.invoke('process-generation-job', {
        body: { jobId: data.id },
      });

      await loadJobs();
      toast.success('Generation started! You can leave the app and return later.');
      
      return data;
    } catch (error) {
      console.error('Error creating generation job:', error);
      toast.error('Failed to start generation');
      throw error;
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('generation_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      await loadJobs();
      toast.success('Generation cancelled');
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Failed to cancel generation');
    }
  };

  const dismissPendingImages = async (jobId: string) => {
    try {
      // Delete the generated images and job
      const { error } = await supabase
        .from('generation_jobs')
        .delete()
        .eq('id', jobId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      await loadPendingImages();
      toast.success('Images dismissed');
    } catch (error) {
      console.error('Error dismissing images:', error);
      toast.error('Failed to dismiss images');
    }
  };

  useEffect(() => {
    if (user) {
      loadJobs();
      loadPendingImages();
    } else {
      setJobs([]);
      setPendingImages([]);
    }
    setLoading(false);
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('generation-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Job status changed:', payload);
          
          // Update the specific job in state immediately
          setJobs(currentJobs => {
            const updatedJobs = [...currentJobs];
            const jobIndex = updatedJobs.findIndex(job => 
              job.id === (payload.new as any)?.id || job.id === (payload.old as any)?.id
            );
            
            if (payload.eventType === 'INSERT' && payload.new) {
              updatedJobs.unshift(payload.new as GenerationJob);
            } else if (payload.eventType === 'UPDATE' && payload.new && jobIndex >= 0) {
              updatedJobs[jobIndex] = payload.new as GenerationJob;
            } else if (payload.eventType === 'DELETE' && jobIndex >= 0) {
              updatedJobs.splice(jobIndex, 1);
            }
            
            return updatedJobs;
          });
          
          // Show notification for completed jobs
          if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
            toast.success(`Your images are ready! Generated ${payload.new.generated_images_count} image${payload.new.generated_images_count !== 1 ? 's' : ''}.`);
            loadPendingImages();
          }
          
          // Show notification for failed jobs
          if (payload.eventType === 'UPDATE' && payload.new?.status === 'failed') {
            toast.error(`Generation failed: ${payload.new.error_message || 'Unknown error'}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const activeJobs = jobs.filter(job => ['pending', 'in_progress'].includes(job.status));
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const failedJobs = jobs.filter(job => job.status === 'failed');

  return {
    jobs,
    activeJobs,
    completedJobs,
    failedJobs,
    pendingImages,
    loading,
    createGenerationJob,
    cancelJob,
    dismissPendingImages,
    loadJobs,
    loadPendingImages,
  };
};