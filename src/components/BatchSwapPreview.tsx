import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OutfitSwapBatch, OutfitSwapJob, OutfitSwapResult } from "@/api/outfit-swap-api";
import { Download, X, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BatchSwapPreviewProps {
  batch: OutfitSwapBatch;
  jobs: OutfitSwapJob[];
  onCancel: () => void;
  onReset: () => void;
}

export const BatchSwapPreview = ({
  batch,
  jobs,
  onCancel,
  onReset,
}: BatchSwapPreviewProps) => {
  const [results, setResults] = useState<Record<string, OutfitSwapResult>>({});

  const progress = batch.total_jobs > 0
    ? Math.round(((batch.completed_jobs + batch.failed_jobs) / batch.total_jobs) * 100)
    : 0;

  const isProcessing = batch.status === "processing" || batch.status === "queued";
  const isCompleted = batch.status === "completed";
  const isFailed = batch.status === "failed";

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
  }, [jobs]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Batch Processing</h2>
          <p className="text-muted-foreground">
            {batch.completed_jobs} of {batch.total_jobs} completed
            {batch.failed_jobs > 0 && ` • ${batch.failed_jobs} failed`}
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
                      <p className="text-xs text-destructive mt-2">{job.error}</p>
                    )}
                    {result && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => downloadImage(result.public_url, job.id)}
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
