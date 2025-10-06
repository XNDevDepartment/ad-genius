
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Image, Check, ExternalLink, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedImagesListProps {
  images: string[];
  prompt?: string;
  settings?: any;
  ugcImageIds?: string[];
}

export const GeneratedImagesList = ({ images, prompt = "Generated UGC image", settings = {}, ugcImageIds = [] }: GeneratedImagesListProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [downloadedImages, setDownloadedImages] = useState<Set<number>>(new Set());
  const [savedImages, setSavedImages] = useState<Set<number>>(new Set());

  const handleDownload = (b64: string, index: number) => {
    const byteString = atob(b64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: "image/png" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ugc-${index + 1}.png`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloadedImages(prev => new Set(prev).add(index));
  };

  const handleSaveToProject = async (b64: string, index: number) => {
    // Images are now automatically saved server-side
    // This is kept for UI compatibility
    setSavedImages(prev => new Set(prev).add(index));
    toast({
      title: "Image already saved!",
      description: "Your images are automatically saved to your library.",
    });
  };

  const handleOpenInNewTab = (b64: string) => {
    try {
      // Convert base64 to blob for reliable handling
      const byteString = atob(b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: "image/png" });
      const blobUrl = URL.createObjectURL(blob);
      
      // Use link element for better compatibility
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Failed to open image:', error);
      toast({
        title: "Failed to open image",
        description: "Unable to open image in new tab.",
        variant: "destructive",
      });
    }
  };

  const handleAnimateImage = (b64: string, index: number) => {
    const ugcImageId = ugcImageIds[index];
    if (!ugcImageId) {
      toast({
        title: "Cannot animate",
        description: "This image hasn't been saved yet. Please wait.",
        variant: "destructive",
      });
      return;
    }

    navigate('/create/video', {
      state: {
        ugc_image_id: ugcImageId,
        preselectedImageUrl: `data:image/png;base64,${b64}`,
      }
    });
  };

  return (
    <Card className="bg-gradient-card border-border/50 animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          Generated Images
        </CardTitle>
        <CardDescription>
          Your AI-generated UGC content is ready
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((b64, i) => {
            const src = `data:image/png;base64,${b64}`;
            const isDownloaded = downloadedImages.has(i);
            
            return (
              <div key={i} className="space-y-3 animate-scale-in">
                <div className="rounded-lg overflow-hidden border border-border/50">
                  <img 
                    src={src}
                    alt={`UGC ${i + 1}`}
                    className="w-full h-auto shadow-card"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button 
                      variant={savedImages.has(i) ? "secondary" : "default"}
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleSaveToProject(b64, i)}
                      disabled={savedImages.has(i)}
                    >
                      {savedImages.has(i) ? (
                        <>
                          <Check className="h-4 w-4" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Save to Project
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenInNewTab(b64)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleAnimateImage(b64, i)}
                    disabled={!ugcImageIds[i]}
                  >
                    <Video className="h-4 w-4" />
                    Animate Image
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
