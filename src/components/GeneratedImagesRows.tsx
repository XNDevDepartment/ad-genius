import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, PlusCircle, ExternalLink, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import './../costumn.css';
import { useState, useEffect } from "react";

// Define types
export type GeneratedImage = { id: string; url?: string; prompt?: string; created_at?: string; format?: string; };

type Props = {
  currentBatchImages: GeneratedImage[];
  previousImages: GeneratedImage[];
  totalSlots: number;
  isGenerating?: boolean;
  onCreateNewScenario: (imageId: string) => void;
  onOpenInLibrary: (imageId?: string) => void;
  onStartFromScratch: () => void;
  threadId?: string;
  imageOrientation?: string;
};

// Placeholder component
function GrainPlaceholder({ label = "Generating...", THUMB_CLASSES }: { label?: string, THUMB_CLASSES?: string }) {
  return (
    <div className={`${THUMB_CLASSES} bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center border border-border/50 grain-pattern`}>
      <div className="text-muted-foreground text-sm font-medium text-center px-4">
        <div className="animate-pulse">
          {label}
        </div>
      </div>
    </div>
  );
}

// Download utility function
function downloadBlob(url: string, filename?: string) {
  try {
    const link = document.createElement('a');
    link.href = url;
    if (filename) {
      link.download = filename;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Download failed:', error);
  }
}

export default function GeneratedImagesRows({
  currentBatchImages,
  previousImages,
  totalSlots,
  isGenerating = false,
  onCreateNewScenario,
  onOpenInLibrary,
  onStartFromScratch,
  threadId,
  imageOrientation
}: Props) {
  // Tower behavior: animated slots at top, then completed images
  // Calculate pending slots based only on current batch, not combined arrays
  const pendingSlots = isGenerating ? Math.max(0, (totalSlots || 0) - currentBatchImages.filter(img => img.url).length) : 0;
  const allImages = [...currentBatchImages, ...previousImages];
  const slots = pendingSlots + allImages.length;

  const [THUMB_CLASSES , setTHUMB_CLASSES] = useState("");
  const [jobAspectRatio, setJobAspectRatio] = useState<string | null>(null);

  // Store initial aspect ratio when job starts, preserve during generation
  useEffect(() => {
    if (threadId && !jobAspectRatio) {
      // Job is active, store the initial aspect ratio immediately
      setJobAspectRatio(imageOrientation);
    } else if (!threadId) {
      // No active job, allow aspect ratio changes
      setJobAspectRatio(null);
    }
  }, [threadId, imageOrientation, jobAspectRatio]);

  // Use preserved aspect ratio during generation, current setting otherwise
  useEffect(() => {
    const activeOrientation = jobAspectRatio || imageOrientation;
    
    if(activeOrientation === '1:1'){
      setTHUMB_CLASSES("relative rounded-xl overflow-hidden w-80 h-80")
    }else if (activeOrientation === '2:3'){
     setTHUMB_CLASSES("relative rounded-xl overflow-hidden w-72 aspect-[2/3]")
    }else{
      setTHUMB_CLASSES("relative rounded-xl overflow-hidden w-[22rem] aspect-[3/2]");
    }
  }, [jobAspectRatio, imageOrientation]);

  return (
    <div className="space-y-4">
      {/* Animated slots first (when generating) */}
      {isGenerating && Array.from({ length: pendingSlots }).map((_, i) => (
        <Card
          key={`pending-slot-${i}`}
          className={cn("rounded-apple shadow-sm")}
        >
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="shrink-0">
                <GrainPlaceholder label="Generating..." THUMB_CLASSES={THUMB_CLASSES} />
              </div>
              <div className="w-full sm:w-[220px] sm:ml-auto grid grid-cols-1 gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-center opacity-50"
                  disabled
                  title="Available when ready"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center opacity-50"
                  disabled
                  title="Available when ready"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Scenario
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => onOpenInLibrary()}
                  title="Open in library"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Library
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Current batch images first (newest) */}
      {currentBatchImages.map((img, i) => (
        <Card
          key={img.id || `current-${i}`}
          className={cn("rounded-apple shadow-sm")}
        >
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="shrink-0">
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.prompt || "Generated image"}
                    className={THUMB_CLASSES}
                  />
                ) : (
                  <GrainPlaceholder label="Processing..." THUMB_CLASSES={THUMB_CLASSES} />
                )}
              </div>

              <div className="w-full sm:w-[220px] sm:ml-auto grid grid-cols-1 gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-center"
                  disabled={!img?.url}
                  onClick={() => {
                    if (!img?.url) return;
                    const extension = img?.format || 'png';
                    downloadBlob(img.url, `produktpix-${img.id || i + 1}.${extension}`);
                  }}
                  title={!img?.url ? "Available when ready" : "Download image"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  disabled={!img?.id}
                  onClick={() => img?.id && onCreateNewScenario(img.id)}
                  title={!img?.id ? "Available when ready" : "Create with new scenario"}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Scenario
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => onOpenInLibrary(img?.id)}
                  title="Open in library"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Library
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Previous images (older) */}
      {previousImages.map((img, i) => (
        <Card
          key={img.id || `previous-${i}`}
          className={cn("rounded-apple shadow-sm")}
        >
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="shrink-0">
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.prompt || "Generated image"}
                    className={THUMB_CLASSES}
                  />
                ) : (
                  <GrainPlaceholder label="Processing..." THUMB_CLASSES={THUMB_CLASSES} />
                )}
              </div>

              <div className="w-full sm:w-[220px] sm:ml-auto grid grid-cols-1 gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-center"
                  disabled={!img?.url}
                  onClick={() => {
                    if (!img?.url) return;
                    const extension = img?.format || 'png';
                    downloadBlob(img.url, `produktpix-${img.id || i + 1}.${extension}`);
                  }}
                  title={!img?.url ? "Available when ready" : "Download image"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  disabled={!img?.id}
                  onClick={() => img?.id && onCreateNewScenario(img.id)}
                  title={!img?.id ? "Available when ready" : "Create with new scenario"}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Scenario
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => onOpenInLibrary(img?.id)}
                  title="Open in library"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Library
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Start from scratch button */}
      <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/10">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <RotateCcw className="h-8 w-8 text-muted-foreground" />
            <div>
              <h3 className="font-medium text-sm mb-1">Ready for a new creation?</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Clear everything and start fresh with a new product and niche
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onStartFromScratch}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                Start from Scratch
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}