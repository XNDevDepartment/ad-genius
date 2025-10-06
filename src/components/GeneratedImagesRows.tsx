"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, PlusCircle, ExternalLink, RotateCcw, ImageIcon, Video, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import "./../costumn.css";

/* Types */
export type Orientation = "1:1" | "2:3" | "3:2";

export type GeneratedImage = {
  id: string;
  url?: string;
  prompt?: string;
  created_at?: string;
  format?: string;
  orientation?: Orientation | string; // <-- per-image
};

type AIScenario = {
  idea: string;
  description: string;
  'small-description': string;
}

type Props = {
  currentBatchImages: GeneratedImage[];
  previousImages: GeneratedImage[];
  totalSlots: number;
  isGenerating?: boolean;
  onCreateNewScenario: (imageId: string) => void;
  onOpenInLibrary: (imageId?: string) => void;
  onStartFromScratch: () => void;
  /** lock placeholders per job (not per thread) */
  jobId?: string | null;
  /** job-level default, used only for placeholders */
  imageOrientation?: Orientation | string;
  aiScenarios?: AIScenario[];
  onAnimateImage?: (imageId: string, imageUrl: string) => void;
};

/* UI helpers */
function GrainPlaceholder({
  label = "Generating...",
  THUMB_CLASSES,
}: { label?: string; THUMB_CLASSES?: string }) {
  return (
    <div
      className={cn(
        THUMB_CLASSES,
        "relative border border-border/50 bg-muted/20 overflow-hidden"
      )}
      aria-label={label}
      role="img"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/60 animate-pulse" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: "100px 100px",
        }}
      />
      <div className="absolute inset-0 gen-glow flex items-center justify-center">
        <div className="text-center relative z-10">
          <ImageIcon className="h-7 w-7 mx-auto mb-2 text-white/90" />
          <p className="text-xs text-white/90">{label}</p>
        </div>
      </div>
    </div>
  );
}

function downloadBlob(url: string, filename?: string) {
  try {
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    const sameOrigin = (() => {
      try {
        const u = new URL(url, window.location.href);
        return u.origin === window.location.origin;
      } catch {
        return false;
      }
    })();
    if (filename && (sameOrigin || url.startsWith("data:"))) a.download = filename;
    else a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    console.error("Download failed:", e);
  }
}

/** Return thumbnail classes for a given orientation. */
function classesFor(orientation?: string) {
  const o = (orientation as Orientation) || "3:2";
  if (o === "1:1") return "relative rounded-xl overflow-hidden w-80 h-80";
  if (o === "2:3") return "relative rounded-xl overflow-hidden w-72 aspect-[2/3]";
  return "relative rounded-xl overflow-hidden w-[22rem] aspect-[3/2]";
}

export default function GeneratedImagesRows({
  currentBatchImages,
  previousImages,
  totalSlots,
  isGenerating = false,
  onCreateNewScenario,
  onOpenInLibrary,
  onStartFromScratch,
  jobId,
  imageOrientation,
  aiScenarios,
  onAnimateImage
}: Props) {
  // Lock placeholder shape for *this job only*
  const [jobAspectRatio, setJobAspectRatio] = useState<string | null>(null);
  useEffect(() => {
    if (jobId) setJobAspectRatio(imageOrientation ?? null);
    else setJobAspectRatio(null);
  }, [jobId, imageOrientation]);

  const readyCount = useMemo(
    () => currentBatchImages.filter((img) => Boolean(img.url)).length,
    [currentBatchImages]
  );
  const pendingSlots = isGenerating
    ? Math.max(0, (totalSlots || 0) - readyCount)
    : 0;

  return (
    <div className="space-y-4">
      {/* Placeholders for the active job */}
      {isGenerating &&
        Array.from({ length: pendingSlots }).map((_, i) => (
          <Card key={`pending-${jobId ?? "none"}-${i}`} className="rounded-apple shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="shrink-0">
                  <GrainPlaceholder
                    label="Generating..."
                    THUMB_CLASSES={classesFor(jobAspectRatio || imageOrientation)}
                  />
                </div>
                <div className="w-full sm:w-[220px] sm:ml-auto grid grid-cols-1 gap-2">
                  <Button variant="default" size="sm" className="w-full justify-center" disabled aria-disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => onOpenInLibrary()}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Library
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

      {/* Newest results */}
      {currentBatchImages.map((img, i) => (
        <Card key={img.id ?? `current-${i}`} className="rounded-apple shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="shrink-0">
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.prompt || "Generated image"}
                    className={classesFor(img.orientation)}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <GrainPlaceholder
                    label="Processing..."
                    THUMB_CLASSES={classesFor(img.orientation || jobAspectRatio || imageOrientation)}
                  />
                )}
              </div>

              <div className="w-full sm:w-[220px] sm:ml-auto grid grid-cols-1 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  disabled={!img?.url}
                  onClick={() => {
                    if (!img?.url) return;
                    window.open(img.url, '_blank');
                  }}
                  title={!img?.url ? "Available when ready" : "Open in new tab"}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>

                {onAnimateImage && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full justify-center"
                    disabled={!img?.url}
                    onClick={() => {
                      if (!img?.url) return;
                      onAnimateImage(img.id, img.url);
                    }}
                    title={!img?.url ? "Available when ready" : "Animate image"}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Animate Image
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  disabled={!img?.url}
                  onClick={() => {
                    if (!img?.url) return;
                    const ext = (img?.format || "png").replace(/^\./, "");
                    downloadBlob(img.url!, `produktpix-${img.id || i + 1}.${ext}`);
                  }}
                  title={!img?.url ? "Available when ready" : "Download image"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => onOpenInLibrary(img?.id)}
                >
                  <Images className="h-4 w-4 mr-2" />
                  Library
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Older results */}
      {previousImages.map((img, i) => (
        <Card key={img.id ?? `previous-${i}`} className="rounded-apple shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="shrink-0">
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.prompt || "Generated image"}
                    className={classesFor(img.orientation)}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <GrainPlaceholder
                    label="Processing..."
                    THUMB_CLASSES={classesFor(img.orientation || jobAspectRatio || imageOrientation)}
                  />
                )}
              </div>

              <div className="w-full sm:w-[220px] sm:ml-auto grid grid-cols-1 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  disabled={!img?.url}
                  onClick={() => {
                    if (!img?.url) return;
                    window.open(img.url, '_blank');
                  }}
                  title={!img?.url ? "Available when ready" : "Open in new tab"}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>

                {onAnimateImage && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full justify-center"
                    disabled={!img?.url}
                    onClick={() => {
                      if (!img?.url) return;
                      onAnimateImage(img.id, img.url);
                    }}
                    title={!img?.url ? "Available when ready" : "Animate image"}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Animate Image
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  disabled={!img?.url}
                  onClick={() => {
                    if (!img?.url) return;
                    const ext = (img?.format || "png").replace(/^\./, "");
                    downloadBlob(img.url!, `produktpix-${img.id || i + 1}.${ext}`);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => onOpenInLibrary(img?.id)}
                >
                  <Images className="h-4 w-4 mr-2" />
                  Library
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Reset CTA */}
      <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/10">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <RotateCcw className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <h3 className="font-medium text-sm mb-1">Ready for a new creation?</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Clear everything and start fresh with a new product and audience
              </p>
              <Button variant="outline" size="sm" onClick={onStartFromScratch} className="text-xs">
                <RotateCcw className="h-3 w-3 mr-2" aria-hidden="true" />
                Start from Scratch
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
