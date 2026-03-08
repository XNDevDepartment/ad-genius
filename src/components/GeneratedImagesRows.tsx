"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, PlusCircle, ExternalLink, RotateCcw, ImageIcon, Video, Images, RefreshCw, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import "./../costumn.css";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import type { TrackedJob } from "@/hooks/useMultiJobTracker";

/* Types */
export type Orientation = "1:1" | "2:3" | "3:2";

export type GeneratedImage = {
  id: string;
  url?: string;
  prompt?: string;
  created_at?: string;
  format?: string;
  orientation?: Orientation | string;
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
  jobId?: string | null;
  imageOrientation?: Orientation | string;
  aiScenarios?: AIScenario[];
  onAnimateImage?: (imageId: string, imageUrl: string) => void;
  /** Multi-job tracked jobs (newest first) */
  trackedJobs?: TrackedJob[];
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

const handleDownload = async (image: GeneratedImage) => {
  try {
    const response = await fetch(image.url);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const extension = image.format || 'png';
    link.download = `ugc-${image.id}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast({
      title: "Download Failed",
      description: "Failed to download image. Please try again.",
      variant: "destructive",
    });
  }
};

/** Return thumbnail classes for a given orientation. */
function classesFor(orientation?: string) {
  const o = (orientation as Orientation) || "3:2";
  if (o === "1:1") return "relative rounded-xl overflow-hidden w-full sm:w-80 aspect-square";
  if (o === "2:3") return "relative rounded-xl overflow-hidden w-full sm:w-72 aspect-[2/3]";
  return "relative rounded-xl overflow-hidden w-full sm:w-[22rem] aspect-[3/2]";
}

/** Render action buttons for a ready image */
function ImageActions({ img, i, onOpenInLibrary, onAnimateImage }: {
  img: GeneratedImage;
  i: number;
  onOpenInLibrary: (imageId?: string) => void;
  onAnimateImage?: (imageId: string, imageUrl: string) => void;
}) {
  return (
    <div className="w-full sm:w-[220px] sm:ml-auto grid grid-cols-2 sm:grid-cols-1 gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-center"
        disabled={!img?.url}
        onClick={() => { if (img?.url) window.open(img.url, '_blank'); }}
        title={!img?.url ? "Available when ready" : "Open in new tab"}
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Open in New Tab</span>
      </Button>

      {onAnimateImage && (
        <Button
          variant="default"
          size="sm"
          className="w-full justify-center"
          disabled={!img?.url}
          onClick={() => { if (img?.url) onAnimateImage(img.id, img.url); }}
          title={!img?.url ? "Available when ready" : "Animate image"}
        >
          <Video className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Animate Image</span>
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
        <span className="hidden sm:inline">Download</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-center"
        onClick={() => onOpenInLibrary(img?.id)}
      >
        <Images className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Library</span>
      </Button>
    </div>
  );
}

/** Render a single image card (ready or placeholder) */
function ImageCard({ img, orientation, onOpenInLibrary, onAnimateImage, index }: {
  img?: GeneratedImage;
  orientation?: string;
  onOpenInLibrary: (imageId?: string) => void;
  onAnimateImage?: (imageId: string, imageUrl: string) => void;
  index: number;
}) {
  const isReady = img?.url;
  return (
    <Card className="rounded-apple shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="shrink-0 w-full sm:w-auto">
            {isReady ? (
              <img
                src={img!.url}
                alt={img!.prompt || "Generated image"}
                className={classesFor(img!.orientation || orientation)}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <GrainPlaceholder
                label="Generating..."
                THUMB_CLASSES={classesFor(orientation)}
              />
            )}
          </div>
          {isReady ? (
            <ImageActions
              img={img!}
              i={index}
              onOpenInLibrary={onOpenInLibrary}
              onAnimateImage={onAnimateImage}
            />
          ) : (
            <div className="w-full sm:w-[220px] sm:ml-auto grid grid-cols-2 sm:grid-cols-1 gap-2">
              <Button variant="default" size="sm" className="w-full justify-center" disabled>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => onOpenInLibrary()}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Library
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
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
  onAnimateImage,
  trackedJobs = [],
}: Props) {
  // Lock placeholder shape for *this job only*
  const [jobAspectRatio, setJobAspectRatio] = useState<string | null>(null);
  useEffect(() => {
    if (jobId) setJobAspectRatio(imageOrientation ?? null);
    else setJobAspectRatio(null);
  }, [jobId, imageOrientation]);

  /* ── Multi-job tracked batches (newest first) ── */
  const hasTrackedJobs = trackedJobs.length > 0;

  return (
    <div className="space-y-4">

      {/* ── Tracked jobs (multi-job) ── */}
      {trackedJobs.map((tj) => {
        const readyImages = tj.images.filter(img => Boolean(img.public_url));
        const pendingCount = Math.max(0, tj.totalSlots - readyImages.length);
        const isActive = tj.status === 'queued' || tj.status === 'processing';
        const isTerminal = ['completed', 'failed', 'canceled'].includes(tj.status);
        const isFinalizing = isTerminal && pendingCount > 0;

        return (
          <div key={tj.jobId} className="space-y-2">
            {/* Batch header with progress */}
            {(isActive || isFinalizing) && (
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">
                  {isFinalizing
                    ? `Finalizing batch… retrieving images (${readyImages.length}/${tj.totalSlots})`
                    : `Generating batch (${readyImages.length}/${tj.totalSlots})...`
                  }
                </span>
                <Progress value={isFinalizing ? 90 : (tj.progress || 0)} className="h-1.5 flex-1 max-w-[120px]" />
              </div>
            )}

            {/* Placeholders for pending slots */}
            {(isActive || isFinalizing) && Array.from({ length: pendingCount }).map((_, i) => (
              <ImageCard
                key={`pending-${tj.jobId}-${i}`}
                orientation={tj.orientation}
                onOpenInLibrary={onOpenInLibrary}
                onAnimateImage={onAnimateImage}
                index={i}
              />
            ))}

            {/* Ready images for this job */}
            {readyImages.map((img, i) => (
              <ImageCard
                key={img.id}
                img={{
                  id: img.id,
                  url: img.public_url,
                  prompt: img.prompt,
                  format: (img.meta as any)?.format || 'png',
                  orientation: (img.meta as any)?.orientation || (img.meta as any)?.aspect_ratio || tj.orientation,
                }}
                orientation={tj.orientation}
                onOpenInLibrary={onOpenInLibrary}
                onAnimateImage={onAnimateImage}
                index={i}
              />
            ))}
          </div>
        );
      })}

      {/* ── Legacy single-job placeholders (only if no tracked jobs) ── */}
      {!hasTrackedJobs && isGenerating && (() => {
        const readyCount = currentBatchImages.filter(img => Boolean(img.url)).length;
        const pendingSlots = Math.max(0, (totalSlots || 0) - readyCount);
        return Array.from({ length: pendingSlots }).map((_, i) => (
          <ImageCard
            key={`pending-${jobId ?? "none"}-${i}`}
            orientation={jobAspectRatio || imageOrientation}
            onOpenInLibrary={onOpenInLibrary}
            onAnimateImage={onAnimateImage}
            index={i}
          />
        ));
      })()}

      {/* ── Legacy current batch images (only if no tracked jobs) ── */}
      {!hasTrackedJobs && currentBatchImages.map((img, i) => (
        <ImageCard
          key={img.id ?? `current-${i}`}
          img={img}
          orientation={img.orientation || jobAspectRatio || imageOrientation}
          onOpenInLibrary={onOpenInLibrary}
          onAnimateImage={onAnimateImage}
          index={i}
        />
      ))}

      {/* ── Previous results ── */}
      {previousImages.map((img, i) => (
        <ImageCard
          key={img.id ?? `previous-${i}`}
          img={img}
          orientation={img.orientation || jobAspectRatio || imageOrientation}
          onOpenInLibrary={onOpenInLibrary}
          onAnimateImage={onAnimateImage}
          index={i}
        />
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
