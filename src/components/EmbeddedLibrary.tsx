import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FileImage, CheckSquare, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLibraryImages, LibraryImage } from "@/hooks/useLibraryImages";
import { useActiveJob } from "@/hooks/useActiveJob";
import { GeneratingImagePlaceholders } from "@/components/departments/ugc/GeneratingImagePlaceholders";
import { ImageLibraryGrid } from "@/components/ImageLibraryGrid";
import { useTranslation } from "react-i18next";

export const EmbeddedLibrary = () => {
  const navigate = useNavigate();
  const [showSourceThumbnails, setShowSourceThumbnails] = useState(false);
  
  // Selection mode states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const { t } = useTranslation();
  const { images, loading, hasMore, loadMore, deleteImage: deleteImageFromDB, deleteImages } = useLibraryImages({ 
    limit: 20
  });
  const { activeJob, activeImages } = useActiveJob();

  const handleDownload = async (image: LibraryImage) => {
    toast({
      title: t('library.actions.downloadStarted', 'Download Started'),
      description: t('library.actions.downloadingImage', 'Downloading image...'),
    });

    try {
      const downloadUrl = image.url;
      
      if (!downloadUrl) {
        throw new Error('No download URL available');
      }

      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const extension = image.settings?.format || 'png';
      link.download = `ugc-${image.id}.${extension}`;
      
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: t('library.actions.downloadFailed', 'Download Failed'),
        description: t('library.actions.downloadFailedDesc', 'Failed to download image. Please try again.'),
        variant: "destructive",
      });
    }
  };

  const handleOpenInNewTab = (imageUrl: string) => {
    try {
      if (!imageUrl.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
        return;
      }
      const [meta, base64] = imageUrl.split(",");
      const mime = meta.split(":")[1]?.split(";")[0] || "image/png";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error("Failed to open image in new tab:", err);
      toast({
        title: t('library.actions.openFailed', 'Failed to Open'),
        description: t('library.actions.openFailedDesc', 'Could not open image in new tab.'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Currently Generating Section */}
      {activeJob && (
        <GeneratingImagePlaceholders
          numberOfImages={activeJob.total}
          isGenerating={activeJob.status === 'processing' || activeJob.status === 'queued'}
          images={activeImages.map(img => ({
            id: img.id,
            url: img.public_url,
            prompt: img.prompt || '',
            selected: false
          }))}
          onImageSelect={() => {}}
          imageOrientation="square"
        />
      )}

      {/* Images Grid */}
      <Card className="bg-gradient-card border-border/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 pb-0">
          <CardTitle className="flex items-center gap-2">
            {t('library.yourImages', 'Your images')}
          </CardTitle>
        </div>
        <CardContent className="pt-4">


          {loading && images.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                <FileImage className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground">{t('library.loading')}</p>
            </div>
          ) : (
            <ImageLibraryGrid
              images={images as any}
              loading={loading}
              hasMore={hasMore}
              showSourceThumbnails={showSourceThumbnails}
              viewMode="ai"
              onLoadMore={loadMore}
              onDelete={deleteImageFromDB}
              onDownload={handleDownload}
              onOpenInNewTab={handleOpenInNewTab}
              selectionMode={selectionMode}
              onSelectionModeChange={setSelectionMode}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onBulkDelete={deleteImages}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};