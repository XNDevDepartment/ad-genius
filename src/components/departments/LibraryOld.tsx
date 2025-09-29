
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLibraryImages } from "@/hooks/useLibraryImages";
import { useActiveJob } from "@/hooks/useActiveJob";
import { useSourceImages } from "@/hooks/useSourceImages";
import { GeneratingImagePlaceholders } from "@/components/departments/ugc/GeneratingImagePlaceholders";
import { ImageLibraryGrid } from "@/components/ImageLibraryGrid";
import { useTranslation } from "react-i18next";

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

interface LibraryProps {
  onBack: () => void;
}

export const Library = ({ onBack }: LibraryProps) => {
  const [showSourceThumbnails, setShowSourceThumbnails] = useState(false);
  const [viewMode, setViewMode] = useState<"ai" | "source">("ai");

  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { images, loading, hasMore, loadMore, deleteImage: deleteImageFromDB } = useLibraryImages({ limit: 20 });
  const { sourceImages, loading: sourceLoading } = useSourceImages();
  const { activeJob, activeImages } = useActiveJob();

  const handleDownload = async (image: LibraryImage) => {
    toast({
      title: "Download Started",
      description: "Downloading image...",
    });

    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const extension = image.settings?.format || 'png';
      link.download = `ugc-${image.id}.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download image. Please try again.",
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
        title: "Failed to Open",
        description: "Could not open image in new tab.",
        variant: "destructive",
      });
    }
  };


  const displayImages = viewMode === "ai" ? images : sourceImages;
  const isLoading = viewMode === "ai" ? loading : sourceLoading;

  return (
    <div className=" lg:p-8 space-y-6 animate-fade-in ">

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
          onImageSelect={() => {}} // No selection needed in library
          imageOrientation="square"
        />
      )}

      {/* Images Grid */}
      <Card className="bg-gradient-card border-border/50">
        <div className="flex items-center justify-between mr-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {viewMode === "ai" ? t('library.aiGenerated') : t('library.sourceImages')} ({displayImages.length})
            </CardTitle>
          </CardHeader>
        </div>
        <CardContent>
          <div className="flex items-start lg:items-center gap-4 mb-6 lg:justify-between flex-col lg:flex-row">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "ai" | "source")}>
              <ToggleGroupItem value="ai" className="text-sm bg-muted">
                {t('library.aiGenerated')}
              </ToggleGroupItem>
              <ToggleGroupItem value="source" className="text-sm bg-muted">
                {t('library.sourceImages')}
              </ToggleGroupItem>
            </ToggleGroup>
            
            {viewMode === "ai" && (
              <div className="flex items-center text-center gap-2">
                <Switch
                  id="source-thumbnails"
                  checked={showSourceThumbnails}
                  onCheckedChange={setShowSourceThumbnails}
                />
                <label htmlFor="source-thumbnails" className="text-sm text-muted-foreground">
                  {t('library.showSource')}
                </label>
              </div>
            )}
          </div>

          {isLoading && displayImages.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                <FileImage className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground">{t('library.loading')}</p>
            </div>
          ) : (
            <ImageLibraryGrid
              images={displayImages as any}
              loading={isLoading}
              hasMore={viewMode === "ai" ? hasMore : false}
              showSourceThumbnails={showSourceThumbnails}
              viewMode={viewMode}
              onLoadMore={loadMore}
              onDelete={deleteImageFromDB}
              onDownload={handleDownload}
              onOpenInNewTab={handleOpenInNewTab}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};