import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
}

interface GeneratedImagesProps {
  images: GeneratedImage[];
  isGenerating: boolean;
}

export const GeneratedImages = ({ images, isGenerating }: GeneratedImagesProps) => {
  const { toast } = useToast();

  const handleDownload = (image: GeneratedImage) => {
    // In real implementation, this would download the image
    toast({
      title: "Download Started",
      description: `Downloading ${image.id}...`,
    });
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          Generated Images
        </CardTitle>
        <CardDescription>
          Your AI-generated UGC content will appear here
        </CardDescription>
      </CardHeader>
      <CardContent>
        {images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image.id} className="space-y-3 animate-scale-in">
                <div className="rounded-lg overflow-hidden border border-border/50">
                  <img 
                    src={image.url} 
                    alt="Generated UGC content" 
                    className="w-full h-auto shadow-card"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {image.prompt}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleDownload(image)}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-border/30 rounded-lg p-6 lg:p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {isGenerating 
                ? "AI is creating your UGC content..." 
                : "Complete the conversation to generate your UGC images"
              }
            </p>
            {isGenerating && (
              <div className="mt-4">
                <div className="w-32 h-2 bg-secondary rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-gradient-primary animate-pulse rounded-full w-full"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};