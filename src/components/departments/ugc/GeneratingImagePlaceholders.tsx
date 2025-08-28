
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "lucide-react";
import './../../../costumn.css';
import ImageGallery from "@/components/ImageGallery";


interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  selected: boolean;
}

interface GeneratingImagePlaceholdersProps {
  numberOfImages: number;
  isGenerating?: boolean;
  images: GeneratedImage[];
  onImageSelect: (imageId: string) => void;
}

export const GeneratingImagePlaceholders = ({
  numberOfImages,
  isGenerating = true,
  images = [],
  onImageSelect
}: GeneratingImagePlaceholdersProps) => {

  return (
    <div id="generating-images" className="scroll-mt-6">
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Generating Images
          </CardTitle>
          <CardDescription>
            AI is creating your UGC content...
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Always show the grid layout to maintain consistent sizing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: images.length }, (_, i) => (
              <div key={i} className="space-y-3 animate-scale-in">
                <div className="aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/20 relative group">
                  {!isGenerating && images[i] ? (
                    // Show actual generated image with same sizing as placeholder
                    <div className="w-full h-full object-cover">
                      <ImageGallery images={images} onImageSelect={onImageSelect}/>
                    </div>
                  ) : (
                    // Show loading placeholder
                    <>
                      {/* Grainy loading effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/60 animate-pulse">
                        <div className="absolute inset-0 opacity-30" 
                             style={{
                               backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
                               backgroundSize: '100px 100px'
                             }}>
                        </div>
                      </div>

                      <div className="absolute inset-0 gen-glow flex items-center justify-center">
                        <div className="text-center relative z-10">
                          <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse text-white" />
                          <p className="text-xs text-muted-foreground text-white">
                            Generating...
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
