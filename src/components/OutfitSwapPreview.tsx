import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/ui/before-after";
import { OutfitSwapJob, OutfitSwapResult } from "@/api/outfit-swap-api";
import { Progress } from "@/components/ui/progress";

interface OutfitSwapPreviewProps {
  job: OutfitSwapJob;
  results: OutfitSwapResult | null;
  onCancel: () => void;
  onReset: () => void;
  personImageUrl: string;
}

export const OutfitSwapPreview = ({
  job,
  results,
  onCancel,
  onReset,
  personImageUrl,
}: OutfitSwapPreviewProps) => {
  const isProcessing = job.status === "queued" || job.status === "processing";
  const isCompleted = job.status === "completed" && results;
  const isFailed = job.status === "failed";

  const getProcessingStage = () => {
    if (job.progress < 20) return "Detecting person & clothing...";
    if (job.progress < 40) return "Loading source images...";
    if (job.progress < 60) return "Aligning garment to pose...";
    if (job.progress < 80) return "Applying outfit swap with AI...";
    if (job.progress < 90) return "Uploading results...";
    return "Finalizing...";
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {isProcessing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Processing Outfit Swap</h3>
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm text-muted-foreground">{getProcessingStage()}</span>
            </div>
            <Progress value={job.progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{job.progress}%</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-6 flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-3">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">AI is swapping the outfit...</p>
            </div>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-destructive">Outfit Swap Failed</h3>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">{job.error || "An unknown error occurred"}</p>
          </div>
          <Button onClick={onReset} variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {isCompleted && results && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Outfit Swap Complete</h3>
              <p className="text-sm text-muted-foreground">
                Processed in {(job.metadata?.processing_time_ms / 1000).toFixed(1)}s using{" "}
                {job.metadata?.model_used}
              </p>
            </div>
            <Button onClick={onReset} variant="outline">
              Start New Swap
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <BeforeAfterSlider
              beforeImage={personImageUrl}
              afterImage={results.public_url}
              alt="Outfit Swap Comparison"
              initialX={0.5}
            />
          </div>

          <div className="flex gap-3">
            {results.jpg_url && (
              <Button
                onClick={() => downloadImage(results.jpg_url!, `outfit-swap-${job.id}.jpg`)}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download JPG
              </Button>
            )}
            {results.png_url && (
              <Button
                onClick={() => downloadImage(results.png_url!, `outfit-swap-${job.id}.png`)}
                className="flex-1"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold">Metadata</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Model:</span>{" "}
                <span className="font-mono">{results.metadata?.model_used}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Dimensions:</span>{" "}
                <span className="font-mono">{results.metadata?.dimensions}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Processing Time:</span>{" "}
                <span className="font-mono">{(results.metadata?.processing_time_ms / 1000).toFixed(2)}s</span>
              </div>
              <div>
                <span className="text-muted-foreground">EXIF Stripped:</span>{" "}
                <span className="font-mono">{results.metadata?.exif_stripped ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
