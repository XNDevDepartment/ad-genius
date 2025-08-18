
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Image, Check, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSecureImageStorage } from "./SecureImageStorage";

interface GeneratedImagesListProps {
  images: string[];
  prompt?: string;
  settings?: any;
}

export const GeneratedImagesList = ({ images, prompt = "Generated UGC image", settings = {} }: GeneratedImagesListProps) => {
  const { toast } = useToast();
  const { saveImages } = useSecureImageStorage();
  const [downloadedImages, setDownloadedImages] = useState<Set<number>>(new Set());
  const [savingImages, setSavingImages] = useState<Set<number>>(new Set());
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
    try {
      setSavingImages(prev => new Set(prev).add(index));
      
      const fullB64 = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
      
      await saveImages({
        base64Images: [fullB64],
        prompt,
        settings
      });

      setSavedImages(prev => new Set(prev).add(index));
      toast({
        title: "Image saved successfully!",
        description: "Your image has been saved to your project library.",
      });
    } catch (error) {
      console.error('Error saving image:', error);
      toast({
        title: "Failed to save image",
        description: "There was an error saving your image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const handleOpenInNewTab = (b64: string) => {
    const src = `data:image/png;base64,${b64}`;
    window.open(src, '_blank');
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
                <div className="flex gap-2">
                  <Button 
                    variant={savedImages.has(i) ? "secondary" : "default"}
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => handleSaveToProject(b64, i)}
                    disabled={savingImages.has(i) || savedImages.has(i)}
                  >
                    {savingImages.has(i) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : savedImages.has(i) ? (
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
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
