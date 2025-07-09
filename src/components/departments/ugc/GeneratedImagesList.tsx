
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Image, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedImagesListProps {
  images: string[];
}

export const GeneratedImagesList = ({ images }: GeneratedImagesListProps) => {
  const { toast } = useToast();
  const [downloadedImages, setDownloadedImages] = useState<Set<number>>(new Set());

  const handleDownload = (b64: string, index: number) => {
    toast({
      title: "Download Started",
      description: `Downloading image ${index + 1}...`,
    });

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
                <Button 
                  variant={isDownloaded ? "secondary" : "outline"}
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => handleDownload(b64, i)}
                  disabled={isDownloaded}
                >
                  {isDownloaded ? (
                    <>
                      <Check className="h-4 w-4" />
                      Downloaded
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
