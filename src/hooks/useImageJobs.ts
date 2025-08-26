
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ImageJob {
  id: string;
  user_id: string;
  prompt: string;
  settings: {
    size?: string;
    quality?: string;
    numberOfImages?: number;
    format?: string;
  };
  status: 'queued' | 'in_progress' | 'succeeded' | 'failed';
  output_url?: string;
  error?: string;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

export const useImageJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [loading, setLoading] = useState(false);

  const createJob = async (prompt: string, settings: ImageJob['settings']) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('image-jobs', {
        body: { prompt, settings }
      });

      if (error) throw error;

      // Add the new job to the local state
      setJobs(prev => [data.job, ...prev]);
      
      return data.job;
    } finally {
      setLoading(false);
    }
  };

  const getJob = async (jobId: string): Promise<ImageJob> => {
    const { data, error } = await supabase.functions.invoke('image-jobs', {
      body: {},
    });

    if (error) throw error;
    return data.job;
  };

  const loadJobs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('image-jobs', {
        body: {}
      });

      if (error) throw error;
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId: string): Promise<ImageJob> => {
    const response = await fetch(`https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/image-jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch job status');
    }

    const { job } = await response.json();
    
    // Update local state
    setJobs(prev => prev.map(j => j.id === jobId ? job : j));
    
    return job;
  };

  useEffect(() => {
    loadJobs();
  }, [user]);

  return {
    jobs,
    loading,
    createJob,
    getJob,
    loadJobs,
    pollJobStatus
  };
};
