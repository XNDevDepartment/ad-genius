import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Save, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { GeneratedImageWithJob } from '@/hooks/useGenerationJobs';
import { useSecureImageStorage } from './SecureImageStorage';
import { toast } from 'sonner';

interface PendingImagesReviewProps {
  images: GeneratedImageWithJob[];
  onDismiss: (jobId: string) => void;
  onSave?: () => void;
}

export const PendingImagesReview = ({ images, onDismiss, onSave }: PendingImagesReviewProps) => {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const { saveImages } = useSecureImageStorage();

  if (images.length === 0) return null;

  // Group images by job
  const imagesByJob = images.reduce((acc, image) => {
    if (!acc[image.job_id]) {
      acc[image.job_id] = [];
    }
    acc[image.job_id].push(image);
    return acc;
  }, {} as Record<string, GeneratedImageWithJob[]>);

  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleSaveSelected = async () => {
    if (selectedImages.size === 0) {
      toast.error('Please select at least one image to save');
      return;
    }

    setSaving(true);
    try {
      const selectedImageData = images.filter(img => selectedImages.has(img.id));
      
      // Convert URLs to base64 for saving
      const base64Images = await Promise.all(
        selectedImageData.map(async (img) => {
          const response = await fetch(img.url);
          const blob = await response.blob();
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        })
      );

      // Use the prompt from the first selected image (they should all be from the same generation)
      const firstImage = selectedImageData[0];
      await saveImages({
        base64Images: base64Images.map(b64 => b64.split(',')[1]), // Remove data URL prefix
        prompt: firstImage.prompt,
        settings: firstImage.settings,
      });

      toast.success(`Saved ${selectedImages.size} image${selectedImages.size !== 1 ? 's' : ''} to your library`);
      setSelectedImages(new Set());
      onSave?.();
    } catch (error) {
      console.error('Error saving images:', error);
      toast.error('Failed to save images');
    } finally {
      setSaving(false);
    }
  };

  const handleDismissJob = async (jobId: string) => {
    setDismissing(jobId);
    try {
      await onDismiss(jobId);
    } finally {
      setDismissing(null);
    }
  };

  const handleDownloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated_image_${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  };

  const handleOpenInNewTab = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Images Are Ready!</h3>
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          {images.length} new image{images.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {Object.entries(imagesByJob).map(([jobId, jobImages]) => (
        <Card key={jobId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Generation Complete
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDismissJob(jobId)}
                disabled={dismissing === jobId}
                className="text-destructive hover:text-destructive"
              >
                {dismissing === jobId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Dismiss All
              </Button>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              "{jobImages[0].prompt}"
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
              {jobImages.map((image, index) => (
                <div key={image.id} className="relative group">
                  <div
                    className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                      selectedImages.has(image.id)
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleImageSelection(image.id)}
                  >
                    <img
                      src={image.url}
                      alt={`Generated image ${index + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    {selectedImages.has(image.id) && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Save className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(image.url, index);
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInNewTab(image.url);
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveSelected}
                disabled={selectedImages.size === 0 || saving}
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Selected ({selectedImages.size})
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  const allJobImageIds = new Set(jobImages.map(img => img.id));
                  setSelectedImages(allJobImageIds);
                }}
              >
                Select All
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setSelectedImages(new Set())}
                disabled={selectedImages.size === 0}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};