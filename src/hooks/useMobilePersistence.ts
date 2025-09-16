import { useEffect } from 'react';
import { useIsMobile } from './use-mobile';

interface JobMetadata {
  id: string;
  numImages: number;
  settings: any;
  prompt: string;
  createdAt: string;
}

export function useMobilePersistence() {
  const isMobile = useIsMobile();

  const saveJobState = (jobId: string, stage: string, metadata: Omit<JobMetadata, 'id'>) => {
    try {
      localStorage.setItem('currentJobId', jobId);
      localStorage.setItem('currentStage', stage);
      
      const jobMetadata: JobMetadata = {
        id: jobId,
        ...metadata
      };
      
      localStorage.setItem('jobMetadata', JSON.stringify(jobMetadata));
      
      // Mobile-specific: save additional recovery timestamp
      if (isMobile) {
        localStorage.setItem('mobileRecoveryTimestamp', Date.now().toString());
      }
    } catch (error) {
      console.error('Failed to save job state:', error);
    }
  };

  const getJobState = () => {
    try {
      const savedJobId = localStorage.getItem('currentJobId');
      const savedStage = localStorage.getItem('currentStage');
      const jobMetadata = localStorage.getItem('jobMetadata');
      const mobileTimestamp = localStorage.getItem('mobileRecoveryTimestamp');

      let metadata: JobMetadata | null = null;
      if (jobMetadata) {
        metadata = JSON.parse(jobMetadata);
        
        // Mobile-specific: validate recovery data freshness (24 hour limit)
        if (isMobile && mobileTimestamp) {
          const timestamp = parseInt(mobileTimestamp);
          const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
          if (timestamp < dayAgo) {
            // Stale data, clear it
            clearJobState();
            return null;
          }
        }
      }

      return savedJobId ? {
        jobId: savedJobId,
        stage: savedStage,
        metadata
      } : null;
    } catch (error) {
      console.error('Failed to get job state:', error);
      return null;
    }
  };

  const clearJobState = () => {
    try {
      localStorage.removeItem('currentJobId');
      localStorage.removeItem('currentStage');
      localStorage.removeItem('jobMetadata');
      if (isMobile) {
        localStorage.removeItem('mobileRecoveryTimestamp');
      }
    } catch (error) {
      console.error('Failed to clear job state:', error);
    }
  };

  // Mobile-specific cleanup on visibility change
  useEffect(() => {
    if (!isMobile) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Save timestamp when app goes to background
        localStorage.setItem('backgroundTimestamp', Date.now().toString());
      } else {
        // Check if we need to refresh state when returning
        const backgroundTime = localStorage.getItem('backgroundTimestamp');
        if (backgroundTime) {
          const timeInBackground = Date.now() - parseInt(backgroundTime);
          // If app was in background for more than 30 minutes, trigger a state refresh
          if (timeInBackground > 30 * 60 * 1000) {
            // Emit custom event for components to handle
            window.dispatchEvent(new CustomEvent('mobileStateRefresh'));
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isMobile]);

  return {
    saveJobState,
    getJobState,
    clearJobState,
    isMobile
  };
}