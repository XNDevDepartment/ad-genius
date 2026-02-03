
# Complete Implementation Plan: Bulk Background Replacement Module

## Overview

This plan provides the complete implementation for the Bulk Background Replacement module, which allows users to batch-process multiple product images with a shared background. The system will use Google Gemini/Imagen API (same as UGC) for AI-powered background replacement.

---

## Architecture Overview

```text
+------------------+     +-------------------+     +------------------+
|   Frontend UI    |     |   Edge Function   |     |   Database       |
|   BulkBackground |---->|   bulk-background |---->|   bulk_bg_jobs   |
|   useBulkBgJob   |     |   (Deno)          |     |   bulk_bg_results|
+------------------+     +-------------------+     +------------------+
         |                       |                        |
         |                       v                        |
         |               +---------------+                |
         |               | Google Gemini |                |
         |               | Imagen API    |                |
         |               +---------------+                |
         |                       |                        |
         v                       v                        v
+------------------+     +-------------------+     +------------------+
| source-images    |     | generated-images  |     | Realtime         |
| (upload bucket)  |     | (result bucket)   |     | Subscriptions    |
+------------------+     +-------------------+     +------------------+
```

---

## 1. Database Schema

### Table: `bulk_background_jobs`

Tracks batch processing jobs.

```sql
CREATE TABLE public.bulk_background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'canceled')),
  
  -- Background configuration
  background_type TEXT NOT NULL CHECK (background_type IN ('preset', 'custom')),
  background_preset_id TEXT,          -- e.g., 'white-seamless', 'beach'
  background_image_url TEXT,          -- For custom uploads
  
  -- Progress tracking
  total_images INTEGER NOT NULL DEFAULT 0,
  completed_images INTEGER NOT NULL DEFAULT 0,
  failed_images INTEGER NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  settings JSONB DEFAULT '{}',        -- Additional settings (format, quality)
  error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.bulk_background_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own jobs" ON public.bulk_background_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON public.bulk_background_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON public.bulk_background_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all jobs" ON public.bulk_background_jobs
  FOR SELECT USING (is_admin());

-- Service role access for edge function
CREATE POLICY "Service role full access" ON public.bulk_background_jobs
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_bulk_bg_jobs_user ON public.bulk_background_jobs(user_id);
CREATE INDEX idx_bulk_bg_jobs_status ON public.bulk_background_jobs(status);

-- Updated_at trigger
CREATE TRIGGER update_bulk_bg_jobs_updated_at
  BEFORE UPDATE ON public.bulk_background_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Table: `bulk_background_results`

Stores individual image results within a job.

```sql
CREATE TABLE public.bulk_background_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.bulk_background_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Source image reference
  source_image_id UUID,              -- Reference to source_images table
  source_image_url TEXT NOT NULL,    -- Original product image URL
  
  -- Result
  result_url TEXT,                   -- Generated image URL
  storage_path TEXT,                 -- Path in storage bucket
  
  -- Status per image
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error TEXT,
  
  -- Metadata
  image_index INTEGER NOT NULL,      -- Position in batch (0-based)
  processing_time_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.bulk_background_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own results" ON public.bulk_background_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own results" ON public.bulk_background_results
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all results" ON public.bulk_background_results
  FOR SELECT USING (is_admin());

CREATE POLICY "Service role full access results" ON public.bulk_background_results
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_bulk_bg_results_job ON public.bulk_background_results(job_id);
CREATE INDEX idx_bulk_bg_results_user ON public.bulk_background_results(user_id);
```

---

## 2. Background Presets with AI Prompts

Update `src/data/background-presets.ts` with actual prompts:

```typescript
export const backgroundPresets: BackgroundPreset[] = [
  // Studio
  { 
    id: 'white-seamless', 
    name: 'White Seamless', 
    category: 'studio',
    prompt: 'Place the product on a clean white seamless paper studio background with soft even lighting, professional product photography style'
  },
  { 
    id: 'black-studio', 
    name: 'Black Studio', 
    category: 'studio',
    prompt: 'Place the product on a matte black studio background with dramatic rim lighting, high-end product photography'
  },
  { 
    id: 'gradient-gray', 
    name: 'Gray Gradient', 
    category: 'studio',
    prompt: 'Place the product on a smooth gray gradient backdrop fading from light to dark, professional catalog photography'
  },
  { 
    id: 'soft-pink', 
    name: 'Soft Pink', 
    category: 'studio',
    prompt: 'Place the product on a soft pastel pink backdrop with feminine aesthetic, beauty product photography style'
  },
  
  // Lifestyle
  { 
    id: 'living-room', 
    name: 'Modern Living Room', 
    category: 'lifestyle',
    prompt: 'Place the product in a modern minimalist living room setting with natural light from large windows, lifestyle product photography'
  },
  { 
    id: 'kitchen', 
    name: 'Bright Kitchen', 
    category: 'lifestyle',
    prompt: 'Place the product on a bright kitchen countertop with marble surface and natural daylight, home lifestyle photography'
  },
  { 
    id: 'bedroom', 
    name: 'Cozy Bedroom', 
    category: 'lifestyle',
    prompt: 'Place the product in a cozy bedroom setting with soft neutral bedding and warm ambient lighting'
  },
  { 
    id: 'home-office', 
    name: 'Home Office', 
    category: 'lifestyle',
    prompt: 'Place the product on a modern home office desk with plants and minimal decor, professional yet homey setting'
  },
  
  // Nature
  { 
    id: 'beach', 
    name: 'Beach Scene', 
    category: 'nature',
    prompt: 'Place the product on a sandy beach with ocean waves in the background, golden hour sunlight, vacation lifestyle'
  },
  { 
    id: 'forest', 
    name: 'Forest Path', 
    category: 'nature',
    prompt: 'Place the product in a serene forest setting with dappled sunlight filtering through trees, natural and organic feel'
  },
  { 
    id: 'garden', 
    name: 'Garden Setting', 
    category: 'nature',
    prompt: 'Place the product in a lush garden with colorful flowers and greenery, fresh spring atmosphere'
  },
  { 
    id: 'mountain', 
    name: 'Mountain View', 
    category: 'nature',
    prompt: 'Place the product with majestic mountain landscape in the background, adventure and outdoor lifestyle'
  },
  
  // Urban
  { 
    id: 'cafe', 
    name: 'Coffee Shop', 
    category: 'urban',
    prompt: 'Place the product on a rustic coffee shop table with warm ambient lighting and bokeh background, urban lifestyle'
  },
  { 
    id: 'street', 
    name: 'Street Style', 
    category: 'urban',
    prompt: 'Place the product in an urban street setting with city architecture and natural daylight, streetwear aesthetic'
  },
  { 
    id: 'rooftop', 
    name: 'Rooftop View', 
    category: 'urban',
    prompt: 'Place the product on a rooftop terrace with city skyline in the background, sophisticated urban setting'
  },
  { 
    id: 'subway', 
    name: 'Metro Station', 
    category: 'urban',
    prompt: 'Place the product in a modern metro station with clean lines and urban commuter atmosphere'
  },
  
  // Magazine
  { 
    id: 'editorial', 
    name: 'Editorial Setup', 
    category: 'magazine',
    prompt: 'Place the product in a high-fashion editorial setup with dramatic lighting and artistic composition, magazine cover quality'
  },
  { 
    id: 'fashion', 
    name: 'Fashion Studio', 
    category: 'magazine',
    prompt: 'Place the product in a fashion photography studio with seamless background and professional studio lighting'
  },
  { 
    id: 'minimal', 
    name: 'Minimalist', 
    category: 'magazine',
    prompt: 'Place the product in an ultra-minimalist setting with lots of negative space, clean Scandinavian aesthetic'
  },
  { 
    id: 'vogue', 
    name: 'Vogue Style', 
    category: 'magazine',
    prompt: 'Place the product in a luxurious Vogue-inspired setting with high-end aesthetic and dramatic fashion lighting'
  },
  
  // Seasonal
  { 
    id: 'christmas', 
    name: 'Christmas Scene', 
    category: 'seasonal',
    prompt: 'Place the product in a festive Christmas setting with decorated tree, warm lights, and cozy holiday atmosphere'
  },
  { 
    id: 'summer', 
    name: 'Summer Vibes', 
    category: 'seasonal',
    prompt: 'Place the product in a bright summer setting with tropical vibes, sunshine, and vacation atmosphere'
  },
  { 
    id: 'autumn', 
    name: 'Autumn Leaves', 
    category: 'seasonal',
    prompt: 'Place the product surrounded by colorful autumn leaves with warm fall lighting and cozy seasonal feel'
  },
  { 
    id: 'spring', 
    name: 'Spring Garden', 
    category: 'seasonal',
    prompt: 'Place the product in a fresh spring garden with blooming flowers, soft pastel colors, and new growth'
  }
];
```

---

## 3. Edge Function: `bulk-background`

### File: `supabase/functions/bulk-background/index.ts`

```typescript
// Core structure (detailed implementation)
serve(async (req) => {
  // CORS handling
  // Auth validation
  
  switch(action) {
    case 'createJob':
      // 1. Validate inputs (source image IDs, background config)
      // 2. Calculate credits (2 per image)
      // 3. Deduct credits upfront
      // 4. Create job record in bulk_background_jobs
      // 5. Create result placeholders in bulk_background_results
      // 6. Trigger worker (fire-and-forget with retry)
      // 7. Return jobId immediately
      
    case 'processJob':
      // Internal worker action (service role only)
      // 1. Update job status to 'processing'
      // 2. For each image in batch:
      //    a. Build prompt (preset prompt + "center the product")
      //    b. Call Gemini API with source image + background
      //    c. Upload result to storage
      //    d. Update result record
      //    e. Update job progress
      // 3. Mark job complete/failed
      // 4. Refund credits for failed images
      
    case 'getJob':
      // Return job with all results
      
    case 'getJobResults':
      // Return paginated results for a job
      
    case 'cancelJob':
      // Cancel in-progress job, refund remaining credits
      
    case 'downloadAll':
      // Generate ZIP of all completed results
      // Return download URL
  }
});
```

### Key Features:

1. **Product Centering**: Every prompt includes instruction to center the product
2. **Retry Logic**: Worker trigger with exponential backoff (3 attempts)
3. **Progress Updates**: Real-time updates via database changes
4. **Credit Management**: Deduct upfront, refund on failure
5. **Custom Background Support**: Upload custom image OR use preset

---

## 4. API Layer

### File: `src/api/bulk-background-api.ts`

```typescript
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
  settings: Record<string, any>;
  error?: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface BulkBackgroundResult {
  id: string;
  job_id: string;
  source_image_url: string;
  result_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  image_index: number;
}

export interface CreateBulkJobPayload {
  sourceImageIds: string[];        // IDs from source_images table
  backgroundType: 'preset' | 'custom';
  backgroundPresetId?: string;     // e.g., 'white-seamless'
  backgroundImageBase64?: string;  // For custom uploads
  settings?: {
    outputFormat?: 'png' | 'webp';
    quality?: 'high' | 'medium';
  };
}

const ENDPOINT = 'https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/bulk-background';

async function callFunction(action: string, payload: any = {}) {
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
    return callFunction('createJob', payload);
  },

  async getJob(jobId: string): Promise<{ job: BulkBackgroundJob }> {
    return callFunction('getJob', { jobId });
  },

  async getJobResults(jobId: string): Promise<{ results: BulkBackgroundResult[] }> {
    return callFunction('getJobResults', { jobId });
  },

  async cancelJob(jobId: string): Promise<{ success: boolean }> {
    return callFunction('cancelJob', { jobId });
  },

  async getDownloadUrl(jobId: string): Promise<{ downloadUrl: string }> {
    return callFunction('downloadAll', { jobId });
  },

  // Realtime subscriptions
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

    return () => supabase.removeChannel(channel);
  },

  subscribeResults(jobId: string, onUpdate: (results: BulkBackgroundResult[]) => void) {
    const channel = supabase
      .channel(`bulk-bg-results:${jobId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bulk_background_results',
        filter: `job_id=eq.${jobId}`
      }, async () => {
        // Refetch all results on any change
        const { results } = await this.getJobResults(jobId);
        onUpdate(results);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
};
```

---

## 5. React Hook

### File: `src/hooks/useBulkBackgroundJob.ts`

```typescript
import { useState, useRef, useEffect } from 'react';
import { bulkBackgroundApi, BulkBackgroundJob, BulkBackgroundResult, CreateBulkJobPayload } from '@/api/bulk-background-api';
import { useToast } from '@/hooks/use-toast';

export const useBulkBackgroundJob = () => {
  const [job, setJob] = useState<BulkBackgroundJob | null>(null);
  const [results, setResults] = useState<BulkBackgroundResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);
  const { toast } = useToast();

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Subscribe to job updates
  useEffect(() => {
    if (!job?.id) return;

    const unsubJob = bulkBackgroundApi.subscribeJob(job.id, (updatedJob) => {
      if (!isMountedRef.current) return;
      setJob(updatedJob);
      
      if (updatedJob.status === 'completed') {
        toast({
          title: "Batch Complete!",
          description: `Processed ${updatedJob.completed_images} of ${updatedJob.total_images} images.`,
        });
      } else if (updatedJob.status === 'failed') {
        setError(updatedJob.error || 'Batch processing failed');
        toast({
          title: "Batch Failed",
          description: updatedJob.error || "Failed to process images",
          variant: "destructive",
        });
      }
    });

    const unsubResults = bulkBackgroundApi.subscribeResults(job.id, (updatedResults) => {
      if (!isMountedRef.current) return;
      setResults(updatedResults);
    });

    return () => {
      unsubJob();
      unsubResults();
    };
  }, [job?.id, toast]);

  const createJob = async (payload: CreateBulkJobPayload) => {
    try {
      setLoading(true);
      setError(null);
      
      const { jobId } = await bulkBackgroundApi.createJob(payload);
      const { job: newJob } = await bulkBackgroundApi.getJob(jobId);
      const { results: initialResults } = await bulkBackgroundApi.getJobResults(jobId);
      
      if (!isMountedRef.current) return null;
      
      setJob(newJob);
      setResults(initialResults);
      
      return { jobId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create batch job';
      setError(message);
      toast({
        title: "Batch Creation Failed",
        description: message,
        variant: "destructive",
      });
      return null;
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const cancelJob = async () => {
    if (!job?.id) return;
    try {
      await bulkBackgroundApi.cancelJob(job.id);
      toast({ title: "Batch Canceled", description: "Processing has been stopped." });
    } catch (err) {
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel batch processing.",
        variant: "destructive",
      });
    }
  };

  const downloadAll = async () => {
    if (!job?.id || job.status !== 'completed') return null;
    try {
      const { downloadUrl } = await bulkBackgroundApi.getDownloadUrl(job.id);
      return downloadUrl;
    } catch (err) {
      toast({
        title: "Download Failed",
        description: "Failed to generate download link.",
        variant: "destructive",
      });
      return null;
    }
  };

  const clearJob = () => {
    setJob(null);
    setResults([]);
    setError(null);
  };

  return {
    job,
    results,
    loading,
    error,
    createJob,
    cancelJob,
    downloadAll,
    clearJob,
    isProcessing: job?.status === 'queued' || job?.status === 'processing',
    isComplete: job?.status === 'completed',
    progress: job ? Math.round((job.completed_images / job.total_images) * 100) : 0
  };
};
```

---

## 6. Frontend Integration

### Updates to `src/pages/BulkBackground.tsx`

```typescript
// Key changes:
import { useBulkBackgroundJob } from '@/hooks/useBulkBackgroundJob';
import { useSourceImageUpload } from '@/hooks/useSourceImageUpload';
import { backgroundPresets } from '@/data/background-presets';

const BulkBackground = () => {
  const { uploadSourceImage } = useSourceImageUpload();
  const { 
    job, 
    results, 
    loading, 
    createJob, 
    cancelJob, 
    downloadAll, 
    clearJob,
    isProcessing,
    isComplete,
    progress 
  } = useBulkBackgroundJob();

  const handleStartProcessing = async () => {
    setStep(4);
    
    // 1. Upload all product images to source-images bucket
    const uploadedIds: string[] = [];
    for (const file of productImages) {
      const uploaded = await uploadSourceImage(file);
      if (uploaded) uploadedIds.push(uploaded.id);
    }
    
    // 2. Get background config
    const preset = selectedPreset 
      ? backgroundPresets.find(p => p.id === selectedPreset) 
      : null;
    
    // 3. Create batch job
    await createJob({
      sourceImageIds: uploadedIds,
      backgroundType: customBackground ? 'custom' : 'preset',
      backgroundPresetId: selectedPreset || undefined,
      backgroundImageBase64: customBackground 
        ? await fileToBase64(customBackground) 
        : undefined,
      settings: { outputFormat: 'webp', quality: 'high' }
    });
  };

  // Rest of component uses job/results from hook
  // Real-time progress updates
  // Download button calls downloadAll()
};
```

---

## 7. Config Updates

### `supabase/config.toml`

```toml
[functions.bulk-background]
verify_jwt = false  # Allow internal worker triggers
```

---

## 8. Implementation Order

| Step | Task | Effort |
|------|------|--------|
| 1 | Add prompts to `background-presets.ts` | 15 min |
| 2 | Database migration (tables + RLS + indexes) | 30 min |
| 3 | Create `bulk-background` edge function | 2-3 hours |
| 4 | Create `bulk-background-api.ts` | 30 min |
| 5 | Create `useBulkBackgroundJob.ts` hook | 45 min |
| 6 | Update `BulkBackground.tsx` page | 1 hour |
| 7 | Testing & debugging | 1-2 hours |

**Total estimated time: 6-8 hours**

---

## 9. Credit System Integration

- **Cost**: 2 credits per image (as defined in frontend)
- **Deduction**: Upfront when job is created
- **Refund**: Automatic refund for any images that fail processing
- **Admin bypass**: Admins process for free (same pattern as UGC)

---

## 10. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/data/background-presets.ts` | Modify | Add AI prompts to all presets |
| `supabase/migrations/*.sql` | Create | Database tables and RLS |
| `supabase/functions/bulk-background/index.ts` | Create | Edge function |
| `supabase/config.toml` | Modify | Add function config |
| `src/api/bulk-background-api.ts` | Create | API client |
| `src/hooks/useBulkBackgroundJob.ts` | Create | React hook |
| `src/pages/BulkBackground.tsx` | Modify | Integrate with real backend |
| `src/i18n/locales/en.json` | Modify | Add any new translation keys |

