import { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Trash2, ExternalLink, Eye, FileImage, Loader2 } from 'lucide-react';
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
}: ImageLibraryGridProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<LibraryImage | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0.5">
        {images.map((image) => {
          const imageUrl = viewMode === "source" ? (image as any).signedUrl : image.url;
          const imageAlt = viewMode === "source" 
            ? `Source: ${(image as any).fileName}` 
            : `Generated: ${image.prompt.substring(0, 50)}...`;
          
          return (
            <div key={image.id} className="space-y-3 animate-scale-in group">
              <div className="overflow-hidden border border-border/50 relative aspect-square">
                <LazyImage 
                  src={imageUrl}
                  alt={imageAlt}
                  className="w-full h-full object-cover shadow-card transition-transform group-hover:scale-105"
                />

                {/* Source image thumbnail overlay */}
                {viewMode === "ai" && showSourceThumbnails && image.sourceSignedUrl && (
                  <div className="absolute bottom-2 left-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-white shadow-lg z-20">
                    <LazyImage 
                      src={image.sourceSignedUrl}
                      alt="Source image"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onOpenInNewTab(imageUrl)}
                    className="bg-background/90 hover:bg-background"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedImage(image)}
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
                    onClick={() => onDownload(image)}
                    className="bg-background/90 hover:bg-background"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>

                {/* Delete button for AI images */}
                {viewMode === "ai" && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deletingId === image.id}
                          className="bg-destructive/90 hover:bg-destructive"
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
    </div>
  );
};