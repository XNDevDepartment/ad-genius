import { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Trash2, ExternalLink, Eye, FileImage, Loader2, Copy, CheckSquare, Square, X } from 'lucide-react';
import { LazyImage } from '@/components/ui/lazy-image';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface LibraryImage {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
  settings: {
    size: string;
    quality: string;
    numberOfImages: number;
    format: string;
  };
  source_image_id?: string;
  sourceSignedUrl?: string;
  job_id?: string;
  desiredAudience?: string;
  prodSpecs?: string;
  source_image_ids?: string[];
  source_type?: 'ugc' | 'outfit_swap' | 'photoshoot' | 'ecommerce';
  photoshoot_id?: string;
  angle_type?: 'front' | 'three_quarter' | 'back' | 'side';
  style_prompt?: string;
  original_result_id?: string;
}

interface ImageLibraryGridProps {
  images: LibraryImage[];
  loading: boolean;
  hasMore: boolean;
  showSourceThumbnails: boolean;
  viewMode: 'ai' | 'source';
  onLoadMore: () => void;
  onDelete: (imageId: string) => Promise<void>;
  onDownload: (image: LibraryImage) => Promise<void>;
  onOpenInNewTab: (imageUrl: string) => void;
  // Bulk delete props
  selectionMode?: boolean;
  onSelectionModeChange?: (mode: boolean) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onBulkDelete?: (imageIds: string[]) => Promise<{ success: number; failed: number }>;
}

export const ImageLibraryGrid = ({
  images,
  loading,
  hasMore,
  showSourceThumbnails,
  viewMode,
  onLoadMore,
  onDelete,
  onDownload,
  onOpenInNewTab,
  selectionMode = false,
  onSelectionModeChange,
  selectedIds = new Set(),
  onSelectionChange,
  onBulkDelete,
}: ImageLibraryGridProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<LibraryImage | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    onChange: (inView) => {
      if (inView && hasMore && !loading) {
        onLoadMore();
      }
    },
  });

  const handleDelete = async (imageId: string) => {
    try {
      setDeletingId(imageId);
      await onDelete(imageId);
      toast({ title: "Image Deleted", description: "Removed from your library." });
    } catch {
      toast({
        title: "Delete Failed",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedIds.size === 0) return;
    
    setBulkDeleting(true);
    try {
      const result = await onBulkDelete(Array.from(selectedIds));
      if (result.failed === 0) {
        toast({ title: t("library.bulkDelete.success", { count: result.success }), description: `Deleted ${result.success} images` });
      } else {
        toast({ title: t("library.bulkDelete.partial", { success: result.success, failed: result.failed }), description: `Deleted ${result.success}, failed ${result.failed}`, variant: "destructive" });
      }
      onSelectionChange?.(new Set());
      onSelectionModeChange?.(false);
    } catch (err) {
      toast({ title: "Delete Failed", description: "Failed to delete images", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  const toggleSelection = (imageId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    onSelectionChange?.(newSelection);
  };

  const selectAll = () => {
    onSelectionChange?.(new Set(images.map(img => img.id)));
  };

  const handleReplicate = (image: LibraryImage) => {
    if (!image.job_id) {
      toast({
        title: "Cannot Replicate",
        description: "Job information not available for this image.",
        variant: "destructive",
      });
      return;
    }

    navigate('/create/ugc', {
      state: {
        replicateJobId: image.job_id,
        desiredAudience: image.desiredAudience,
        prodSpecs: image.prodSpecs,
        settings: image.settings,
        sourceImageIds: image.source_image_ids || (image.source_image_id ? [image.source_image_id] : [])
      }
    });

    toast({
      title: "Replicating Generation",
      description: "Loading previous generation settings...",
    });
  };

  const handleReplicateOutfitSwap = (image: LibraryImage) => {
    if (!image.job_id || image.source_type !== 'outfit_swap') {
      toast({
        title: "Cannot Replicate",
        description: "Outfit swap information not available for this image.",
        variant: "destructive",
      });
      return;
    }

    navigate('/create/outfit-swap', {
      state: {
        replicateMode: true,
        jobId: image.job_id,
        resultId: image.id,
        imageUrl: image.url
      }
    });

    toast({
      title: "Loading Outfit Swap Result",
      description: "Preparing to create photoshoots or e-commerce images...",
    });
  };

  if (images.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
          <FileImage className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-2">{t('library.empty.title')}</p>
        <p className="text-sm text-muted-foreground">{t('library.empty.description')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Mode Header */}
      {selectionMode && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0 || bulkDeleting}
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              {bulkDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSelectionChange?.(new Set());
                onSelectionModeChange?.(false);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0.5">
        {images.map((image) => {
          const imageUrl = viewMode === "source" ? (image as any).signedUrl : image.url;
          const imageAlt = viewMode === "source"
            ? `Source: ${(image as any).fileName}`
            : `Generated: ${image.prompt.substring(0, 50)}...`;

          return (
            <div 
              key={image.id} 
              className={`space-y-3 animate-scale-in group ${selectionMode && selectedIds.has(image.id) ? 'ring-2 ring-primary rounded-lg' : ''}`}
              onClick={() => selectionMode && toggleSelection(image.id)}
            >
              <div className="overflow-hidden border border-border/50 relative aspect-square">
                <LazyImage 
                  src={imageUrl}
                  alt={imageAlt}
                  className="w-full h-full object-cover shadow-card transition-transform group-hover:scale-105"
                />

                {/* Selection Checkbox */}
                {selectionMode && (
                  <div className="absolute top-2 left-2 z-20">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${
                      selectedIds.has(image.id) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-background/80 border border-border'
                    }`}>
                      {selectedIds.has(image.id) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                )}

                {/* Source image thumbnail overlay */}
                {viewMode === "ai" && showSourceThumbnails && image.sourceSignedUrl && !selectionMode && (
                  <div className="absolute bottom-2 left-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-white shadow-lg z-20">
                    <LazyImage 
                      src={image.sourceSignedUrl}
                      alt="Source image"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Action buttons - hidden in selection mode */}
                {!selectionMode && (
                  <>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); onOpenInNewTab(imageUrl); }}
                        className="bg-background/90 hover:bg-background"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      
                      {viewMode === "ai" && image.job_id && image.source_type === 'outfit_swap' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); handleReplicateOutfitSwap(image); }}
                          className="bg-background/90 hover:bg-background"
                          title="Reuse this outfit swap result"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {viewMode === "ai" && image.job_id && image.source_type !== 'outfit_swap' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); handleReplicate(image); }}
                          className="bg-background/90 hover:bg-background"
                          title="Replicate this generation"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); setSelectedImage(image); }}
                            className="bg-background/90 hover:bg-background"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                          <div className="space-y-4">
                            <img
                              src={imageUrl}
                              alt={imageAlt}
                              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); onDownload(image); }}
                        className="bg-background/90 hover:bg-background"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Delete button */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deletingId === image.id}
                            className="bg-destructive/90 hover:bg-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('library.actions.deleteConfirm.title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('library.actions.deleteConfirm.description')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('library.actions.deleteConfirm.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(image.id)}>
                              {deletingId === image.id ? t('library.actions.deleteConfirm.deleting') : t('library.actions.deleteConfirm.delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Trigger */}
      {hasMore && (
        <div 
          ref={loadMoreRef}
          className="flex justify-center py-8"
        >
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more images...</span>
            </div>
          ) : (
            <Button 
              variant="outline" 
              onClick={onLoadMore}
              className="px-8"
            >
              Load More Images
            </Button>
          )}
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} images?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};