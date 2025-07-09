
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "lucide-react";

interface GeneratingImagePlaceholdersProps {
  numberOfImages: number;
}

export const GeneratingImagePlaceholders = ({ numberOfImages }: GeneratingImagePlaceholdersProps) => {
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
            {Array.from({ length: numberOfImages }, (_, i) => (
              <div key={i} className="space-y-3 animate-scale-in">
                <div className="aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/20 relative">
                  {/* Grainy loading effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/60 animate-pulse">
                    <div className="absolute inset-0 opacity-50" 
                         style={{
                           backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
                           backgroundSize: '100px 100px'
                         }}>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
                      <p className="text-xs text-muted-foreground">Generating...</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <div className="w-32 h-2 bg-secondary rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-primary animate-pulse rounded-full w-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
