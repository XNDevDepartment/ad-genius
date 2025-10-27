import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OutfitSwapBatch, OutfitSwapJob, OutfitSwapResult } from "@/api/outfit-swap-api";
import { Download, X, CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw, Eye, Film, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { useNavigate } from "react-router-dom";

interface BatchSwapPreviewProps {
  batch: OutfitSwapBatch;
  jobs: OutfitSwapJob[];
  onCancel: () => void;
  onReset: () => void;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export const BatchSwapPreview = ({
  batch,
  jobs,
  onCancel,
  onReset,
  onRefresh,
  loading = false,
}: BatchSwapPreviewProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<Record<string, OutfitSwapResult>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const progress = batch.total_jobs > 0
    ? Math.round(((batch.completed_jobs + batch.failed_jobs) / batch.total_jobs) * 100)
    : 0;

  const isProcessing = batch.status === "processing" || batch.status === "queued";
  const isCompleted = batch.status === "completed";
  const isFailed = batch.status === "failed";
  
  const creditsUsed = batch.metadata?.credits_deducted || 0;

  // Load results for completed jobs
  useEffect(() => {
    const loadResults = async () => {
      const completedJobIds = jobs
        .filter((job) => job.status === "completed")
        .map((job) => job.id);

      if (completedJobIds.length === 0) return;

      const { data } = await supabase
        .from("outfit_swap_results")
        .select("*")
        .in("job_id", completedJobIds);

      if (data) {
        const resultsMap: Record<string, OutfitSwapResult> = {};
        data.forEach((result) => {
          resultsMap[result.job_id] = result;
        });
        setResults(resultsMap);
      }
    };

    loadResults();
  }, [jobs.map(j => j.status).join(',')]); // Re-run when any job status changes

  // Subscribe to realtime result insertions
  useEffect(() => {
    if (jobs.length === 0) return;

    const jobIds = jobs.map((j) => j.id);
    
    const channel = supabase
      .channel(`batch-results-${batch.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "outfit_swap_results",
        },
        (payload) => {
          const newResult = payload.new as OutfitSwapResult;
          // Only add if it's for one of our jobs
          if (jobIds.includes(newResult.job_id)) {
            setResults((prev) => ({
              ...prev,
              [newResult.job_id]: newResult,
            }));
            toast({
              title: "Result ready",
              description: "A new outfit swap result is available",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [batch.id, jobs.length]);

  const refreshResults = async () => {
    setIsRefreshing(true);
    const completedJobIds = jobs
      .filter((job) => job.status === "completed")
      .map((job) => job.id);

    if (completedJobIds.length === 0) {
      setIsRefreshing(false);
      return;
    }

    const { data } = await supabase
      .from("outfit_swap_results")
      .select("*")
      .in("job_id", completedJobIds);

    if (data) {
      const resultsMap: Record<string, OutfitSwapResult> = {};
      data.forEach((result) => {
        resultsMap[result.job_id] = result;
      });
      setResults(resultsMap);
      toast({
        title: "Results refreshed",
        description: `Loaded ${data.length} results`,
      });
    }
    setIsRefreshing(false);
  };

  const getJobIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-destructive" />;
      case "processing":
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const downloadImage = async (url: string, jobId: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `outfit-swap-${jobId}.png`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const downloadAll = async () => {
    const completedResults = Object.values(results);
    for (const result of completedResults) {
      await downloadImage(result.public_url, result.job_id);
      // Small delay to avoid overwhelming the browser
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, "_blank");
  };

  const handleAnimate = (imageUrl: string) => {
    navigate("/create/video", {
      state: {
        preselectedImageUrl: imageUrl,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Batch Processing</h2>
          <p className="text-muted-foreground">
            {batch.completed_jobs} of {batch.total_jobs} completed
            {batch.failed_jobs > 0 && ` • ${batch.failed_jobs} failed`}
            {isAdmin ? " • Admin: Unlimited Credits" : creditsUsed > 0 && ` • ${creditsUsed} credits used`}
          </p>
        </div>
        <div className="flex gap-2">
          {isProcessing && (
            <Button variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel Batch
            </Button>
          )}
          {(isCompleted || isFailed) && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={async () => {
                  if (onRefresh) {
                    await onRefresh();
                  }
                  await refreshResults();
                }}
                disabled={isRefreshing || loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {batch.completed_jobs > 0 && (
                <Button onClick={downloadAll}>
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
              )}
              <Button variant="outline" onClick={onReset}>
                Start New Batch
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      <Card className="p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Overall Progress</span>
            <Badge
              variant={
                isCompleted
                  ? "default"
                  : isFailed
                  ? "destructive"
                  : "secondary"
              }
            >
              {batch.status}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">{progress}% complete</p>
        </div>
      </Card>

      {/* Jobs Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Individual Swaps</h3>
        <ScrollArea className="h-[500px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job, index) => {
              const result = results[job.id];
              const isStuck = job.status === "processing" && 
                new Date().getTime() - new Date(job.created_at || Date.now()).getTime() > 120000; // 2 minutes
              
              return (
                <Card key={job.id} className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    {result && (
                      <img
                        src={result.public_url}
                        alt={`Swap ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {!result && job.status === "processing" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Swap {index + 1}</span>
                      {getJobIcon(job.status)}
                    </div>
                    {job.progress > 0 && job.status === "processing" && (
                      <Progress value={job.progress} className="h-1 mb-2" />
                    )}
                    {job.error && (
                      <div className="mt-2">
                        <p className="text-xs text-destructive font-medium">
                          {job.error}
                        </p>
                        {job.metadata?.error_type === "api_credits_exhausted" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            This is a system-level issue. Please contact support.
                          </p>
                        )}
                      </div>
                    )}
                    {isStuck && (
                      <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md mt-2">
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          ⚠️ This job may be stuck. Try clicking Refresh.
                        </p>
                      </div>
                    )}
                    {result && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewImage({ url: result.public_url, name: `Swap ${index + 1}` })}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openInNewTab(result.public_url)}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAnimate(result.public_url)}
                        >
                          <Film className="w-3 h-3 mr-1" />
                          Animate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadImage(result.public_url, job.id)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <ImagePreviewModal
        isOpen={previewImage !== null}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ""}
        imageName={previewImage?.name || ""}
        onDownload={() => previewImage && downloadImage(previewImage.url, `outfit-swap-${batch.id}.jpg`)}
        onOpenInNewTab={() => previewImage && openInNewTab(previewImage.url)}
      />
    </div>
  );
};
