
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "lucide-react";
import './../../../costumn.css';

interface GeneratingImagePlaceholdersProps {
  numberOfImages: number;
  isGenerating?: boolean;
  images?: string[];
  onImageSelect?: (imageId: string) => void;
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: numberOfImages }, (_, i) => {
              const hasImage = images[i] && !isGenerating;
              const imageId = `image-${i}`;
              
              return (
                <div key={i} className="space-y-3 animate-scale-in">
                  <div className="aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/20 relative group">
                    {hasImage ? (
                      // Show actual image
                      <>
                        <img
                          src={images[i]}
                          alt={`Generated image ${i + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {onImageSelect && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
                            <button
                              onClick={() => onImageSelect(imageId)}
                              className="absolute top-2 left-2 w-6 h-6 rounded-full border-2 border-white bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center hover:bg-white/40"
                            >
                              <div className="w-3 h-3 rounded-full bg-primary"></div>
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      // Show futuristic loading placeholder
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
                            <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
                            <p className="text-xs text-muted-foreground">Generating...</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {isGenerating && (
            <div className="mt-4 text-center">
              <div className="w-32 h-2 bg-secondary rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-gradient-primary animate-pulse rounded-full w-full"></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
