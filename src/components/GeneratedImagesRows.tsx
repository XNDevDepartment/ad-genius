// components/GeneratedImagesRows.tsx
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, PlusCircle, ArrowRight, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import "./../costumn.css";
import { useEffect, useState } from "react";

export type GeneratedImage = {
  id: string;
  url?: string;
  prompt?: string;
  created_at?: string;
  format?: string;
};

type Props = {
  images: GeneratedImage[];
  totalSlots: number;
  isGenerating?: boolean;
  onCreateNewScenario: (imageId: string) => void;
  onOpenInLibrary: (imageId?: string) => void;
  onStartFromScratch: () => void;
  threadId?: string;
  imageOrientation?: string;
};




// replace your broken line with this

function GrainPlaceholder({ label = "Generating...", THUMB_CLASSES }: { label?: string, THUMB_CLASSES?: string }) {

  return (
    <div className={cn(THUMB_CLASSES, "border border-border/50 bg-muted/20")}>
      <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/60 animate-pulse" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: "100px 100px",
        }}
      />
      <div className="absolute inset-0 gen-glow flex items-center justify-center ">
        <div className="text-center relative z-10">
          <ImageIcon className="h-7 w-7 mx-auto mb-2 text-white/90" />
          <p className="text-xs text-white/90">{label}</p>
        </div>
      </div>
    </div>
  );
}

function downloadBlob(url: string, filename = "image.png") {
  const finalFilename = filename.includes('.') ? filename : `${filename}.png`;
  if (url.startsWith("data:")) {
    const [meta, base64] = url.split(",");
    const mime = meta.split(":")[1]?.split(";")[0] || "image/png";
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const tmp = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: tmp, download: finalFilename });
    a.click(); setTimeout(() => URL.revokeObjectURL(tmp), 30000);
    return;
  }
  fetch(url).then(r => r.blob()).then(blob => {
    const tmp = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: tmp, download: finalFilename });
    a.click(); setTimeout(() => URL.revokeObjectURL(tmp), 30000);
  }).catch(console.error);
}

export default function GeneratedImagesRows({
  images,
  totalSlots,
  isGenerating = false,
  onCreateNewScenario,
  onOpenInLibrary,
  onStartFromScratch,
  threadId,
  imageOrientation
}: Props) {
  const slots = Math.max(totalSlots || 0, images.length || 0);

  const [THUMB_CLASSES , setTHUMB_CLASSES] = useState("");

  useEffect(() => {
    if(imageOrientation === '1:1'){
      setTHUMB_CLASSES("relative rounded-xl overflow-hidden w-80 h-80")
    }else if (imageOrientation === '2:3'){
     setTHUMB_CLASSES("relative rounded-xl overflow-hidden w-72 aspect-[2/3]")
    }else{
      setTHUMB_CLASSES("relative rounded-xl overflow-hidden w-[22rem] aspect-[3/2]");

    }
  }, [imageOrientation]);

  return (
    <div className="space-y-4">
      {Array.from({ length: 1 }).map((_, i) => {
        const img = images[i];

        return (
          <Card
            key={img?.id ?? `slot-${i}`}
            className={cn(!threadId && "opacity-50 pointer-events-none", "rounded-apple shadow-sm")}
          >
            <CardContent className="p-4">
              {/* Mobile: stack; ≥sm: row */}
              <div className="flex flex-col  sm:flex-row items-center gap-4">
                {/* Left: thumbnail */}
                <div className="shrink-0">
                  {img?.url ? (
                    <div className={THUMB_CLASSES}>
                      <img
                        src={img.url}
                        alt={img.prompt || `Generated image ${i + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <GrainPlaceholder label={isGenerating ? "Generating..." : "Waiting"} THUMB_CLASSES={THUMB_CLASSES} />
                  )}
                </div>

                {/* Right: actions (stacked) */}
                <div className="w-full sm:w-[220px] sm:ml-auto grid grid-cols-1 gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full justify-center"
                    // disabled={!img?.url}
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
        );
      })}

      {/* Bottom CTA */}
      {(!isGenerating || images.length > 0) && (
        <div className="pt-2 flex justify-center">
          <Button
            size="lg"
            className="w-full sm:w-auto rounded-full px-6"
            onClick={onStartFromScratch}
          >
            Start from scratch
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
