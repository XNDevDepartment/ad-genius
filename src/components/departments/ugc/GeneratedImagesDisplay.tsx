
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Image, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedImagesDisplayProps {
  images: string[];
  onViewLibrary?: () => void;
}

export const GeneratedImagesDisplay = ({ images, onViewLibrary }: GeneratedImagesDisplayProps) => {
  const { toast } = useToast();

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
    link.download = `ugc-image-${index + 1}.png`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Download Complete",
      description: `Image ${index + 1} downloaded successfully!`,
    });
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <Card id="generated-images" className="bg-gradient-card border-border/50 animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          Generated Images ({images.length})
        </CardTitle>
        <CardDescription>
          Your AI-generated UGC content is ready
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((b64, i) => {
              const src = `data:image/png;base64,${b64}`;
              
              return (
                <div key={i} className="space-y-3 animate-scale-in">
                  <div className="rounded-lg overflow-hidden border border-border/50 aspect-square">
                    <img 
                      src={src}
                      alt={`UGC ${i + 1}`}
                      className="w-full h-full object-cover shadow-card"
                    />
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleDownload(b64, i)}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              );
            })}
          </div>
          
          {onViewLibrary && (
            <div className="pt-4 border-t flex justify-center">
              <Button variant="outline" onClick={onViewLibrary} className="gap-2">
                <Eye className="h-4 w-4" />
                View All in Library
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
