import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadProgress {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  result?: {
    id: string;
    publicUrl: string;
    fileName: string;
  };
}

interface BulkUploadResult {
  uploadFiles: (files: File[]) => Promise<void>;
  uploading: boolean;
  progress: UploadProgress[];
  successCount: number;
  errorCount: number;
  reset: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 20;
const BATCH_SIZE = 3;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export const useSourceImageBulkUpload = (): BulkUploadResult => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Unsupported format';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large (max 10MB)';
    }
    return null;
  };

  const uploadSingleFile = async (file: File, index: number): Promise<void> => {
    // Update status to uploading
    setProgress(prev => prev.map((p, i) => 
      i === index ? { ...p, status: 'uploading' as const, progress: 10 } : p
    ));

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProgress(prev => prev.map((p, i) => 
        i === index ? { ...p, progress: 50 } : p
      ));

      // Call the upload-source-image edge function
      const { data, error } = await supabase.functions.invoke('upload-source-image', {
        body: {
          base64Image: base64,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        }
      });

      if (error) {
        throw new Error(error.message || 'Upload failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update status to success
      setProgress(prev => prev.map((p, i) => 
        i === index ? { 
          ...p, 
          status: 'success' as const, 
          progress: 100,
          result: data.sourceImage 
        } : p
      ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setProgress(prev => prev.map((p, i) => 
        i === index ? { ...p, status: 'error' as const, error: errorMessage } : p
      ));
    }
  };

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    if (files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    setUploading(true);

    // Initialize progress state with validation
    const initialProgress: UploadProgress[] = files.map(file => {
      const validationError = validateFile(file);
      return {
        file,
        status: validationError ? 'error' as const : 'pending' as const,
        progress: validationError ? 0 : 0,
        error: validationError || undefined
      };
    });

    setProgress(initialProgress);

    // Get valid files indices
    const validIndices = initialProgress
      .map((p, i) => p.status === 'pending' ? i : -1)
      .filter(i => i !== -1);

    // Process in batches
    for (let i = 0; i < validIndices.length; i += BATCH_SIZE) {
      const batch = validIndices.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(index => uploadSingleFile(files[index], index)));
    }

    setUploading(false);
  }, []);

  const reset = useCallback(() => {
    setProgress([]);
    setUploading(false);
  }, []);

  const successCount = progress.filter(p => p.status === 'success').length;
  const errorCount = progress.filter(p => p.status === 'error').length;

  return {
    uploadFiles,
    uploading,
    progress,
    successCount,
    errorCount,
    reset
  };
};
