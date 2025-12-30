import { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, CheckCircle, AlertCircle, FileImage } from 'lucide-react';
import { useSourceImageBulkUpload, UploadProgress } from '@/hooks/useSourceImageBulkUpload';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface BulkImageUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export const BulkImageUploadModal = ({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: BulkImageUploadModalProps) => {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFiles, uploading, progress, successCount, errorCount, reset } = useSourceImageBulkUpload();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files].slice(0, 20));
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files].slice(0, 20));
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    await uploadFiles(selectedFiles);
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFiles([]);
      reset();
      onOpenChange(false);
    }
  };

  // When upload completes successfully, notify parent
  useEffect(() => {
    if (!uploading && progress.length > 0 && successCount > 0) {
      onUploadComplete();
    }
  }, [uploading, progress.length, successCount, onUploadComplete]);

  const isComplete = progress.length > 0 && !uploading;
  const allUploaded = progress.length > 0 && progress.every(p => p.status === 'success' || p.status === 'error');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {t('library.bulkUpload.title', 'Upload Source Images')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Dropzone - only show when not uploading */}
          {!uploading && progress.length === 0 && (
            <>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragging 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <FileImage className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-foreground mb-1">
                  {t('library.bulkUpload.dropzone', 'Drag & drop images here or click to select')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('library.bulkUpload.supportedFormats', 'PNG, JPG, JPEG, WEBP')} • {t('library.bulkUpload.maxSize', 'Max 10MB per file')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected files list */}
              {selectedFiles.length > 0 && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {t('library.bulkUpload.selectedFiles', 'Selected Files')} ({selectedFiles.length}/20)
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedFiles([])}
                      className="text-xs"
                    >
                      {t('common.remove', 'Clear All')}
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-48 space-y-2 pr-2">
                    {selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        <FileImage className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {(file.size / 1024 / 1024).toFixed(1)}MB
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Upload progress */}
          {progress.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {uploading 
                    ? t('library.bulkUpload.uploading', 'Uploading...') 
                    : t('library.bulkUpload.complete', 'Upload Complete')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {successCount} {t('library.bulkUpload.success', 'succeeded')}
                  {errorCount > 0 && `, ${errorCount} ${t('library.bulkUpload.error', 'failed')}`}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-64 space-y-2 pr-2">
                {progress.map((item, index) => (
                  <UploadProgressItem key={`${item.file.name}-${index}`} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            {allUploaded ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
          </Button>
          {!allUploaded && (
            <Button 
              onClick={handleUpload} 
              disabled={selectedFiles.length === 0 || uploading}
            >
              {uploading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {t('library.bulkUpload.uploading', 'Uploading...')}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {t('library.bulkUpload.uploadAll', 'Upload All')} ({selectedFiles.length})
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const UploadProgressItem = ({ item }: { item: UploadProgress }) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
      {item.status === 'success' && (
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
      )}
      {item.status === 'error' && (
        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
      )}
      {(item.status === 'pending' || item.status === 'uploading') && (
        <FileImage className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm truncate">{item.file.name}</span>
          {item.status === 'uploading' && (
            <span className="text-xs text-muted-foreground ml-2">{item.progress}%</span>
          )}
        </div>
        {item.status === 'uploading' && (
          <Progress value={item.progress} className="h-1" />
        )}
        {item.error && (
          <span className="text-xs text-destructive">{item.error}</span>
        )}
      </div>
    </div>
  );
};
