import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OutfitSwapBatch, OutfitSwapJob, OutfitSwapResult } from "@/api/outfit-swap-api";
import { Download, X, CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw, Eye, Film, ExternalLink, Camera, ShoppingBag, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { ecommercePhotoApi, EcommercePhotoJob } from "@/api/ecommerce-photo-api";
import { EcommercePhotoModal } from "@/components/EcommercePhotoModal";
import { EcommerceIdeasModal } from "@/components/EcommerceIdeasModal";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { PhotoshootModal } from "./PhotoshootModal";
import { photoshootApi } from "@/api/photoshoot-api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import AnimateImageModal from "@/components/AnimateImageModal";

interface BatchSwapPreviewProps {
  batch: OutfitSwapBatch;
  jobs: OutfitSwapJob[];
  onCancel: () => void;
  onReset: () => void;
  onRefresh?: () => Promise<void>;
  onRetryJob?: (jobId: string) => Promise<void>;
  retryingJobs?: Set<string>;
  loading?: boolean;
  initialResults?: Record<string, OutfitSwapResult>;
}

export const BatchSwapPreview = ({
  batch,
  jobs,
  onCancel,
  onReset,
  onRefresh,
  onRetryJob,
  retryingJobs = new Set(),
  loading = false,
  initialResults,
}: BatchSwapPreviewProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin } = useAdminAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [results, setResults] = useState<Record<string, OutfitSwapResult>>(initialResults || {});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [photoshootLoading, setPhotoshootLoading] = useState<Record<string, boolean>>({});
  const [photoshootModal, setPhotoshootModal] = useState<{
    isOpen: boolean;
    resultId: string | null;
    originalImageUrl: string | null;
  }>({ isOpen: false, resultId: null, originalImageUrl: null });
  const [ecommerceIdeasModal, setEcommerceIdeasModal] = useState<{
    isOpen: boolean;
    resultId: string | null;
    imageUrl: string | null;
  }>({ isOpen: false, resultId: null, imageUrl: null });
  const [ecommercePhotoModal, setEcommercePhotoModal] = useState<{
    isOpen: boolean;
    photoId: string | null;
    originalImageUrl: string | null;
  }>({ isOpen: false, photoId: null, originalImageUrl: null });
  const [animateModal, setAnimateModal] = useState<{
    open: boolean;
    imageUrl: string | null;
    imageId: string | null;
  }>({ open: false, imageUrl: null, imageId: null });

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
              title: t('outfitSwap.toasts.resultReady'),
              description: t('outfitSwap.toasts.resultReadyDesc'),
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
        title: t('outfitSwap.toasts.resultsRefreshed'),
        description: t('outfitSwap.toasts.resultsRefreshedDesc', { count: data.length }),
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

  const handleAnimate = (imageUrl: string, result: any) => {
    setAnimateModal({
      open: true,
      imageUrl,
      imageId: result.id,
    });
  };

  const handleCreatePhotoshoot = async (result: OutfitSwapResult) => {
    setPhotoshootModal({
      isOpen: true,
      resultId: result.id,
      originalImageUrl: result.public_url,
    });
  };

  const handleCreateEcommercePhoto = async (result: OutfitSwapResult) => {
    // Open ideas modal first
    setEcommerceIdeasModal({
      isOpen: true,
      resultId: result.id,
      imageUrl: result.public_url,
    });
  };

  const handleEcommerceIdeaSelected = async (stylePrompt: string, resultId: string) => {
    try {
      const ecommercePhoto = await ecommercePhotoApi.createEcommercePhoto(resultId, stylePrompt);
      setEcommercePhotoModal({
        isOpen: true,
        photoId: ecommercePhoto.id,
        originalImageUrl: ecommerceIdeasModal.imageUrl,
      });
      setEcommerceIdeasModal({ isOpen: false, resultId: null, imageUrl: null });
      toast({
        title: t('outfitSwap.toasts.ecommerceStarted'),
        description: t('outfitSwap.toasts.ecommerceStartedDesc'),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('outfitSwap.toasts.ecommerceFailed'),
        description: error.message,
      });
    }
  };

  return (
    <div className={cn("space-y-6", isMobile && (isCompleted || isFailed) && "pb-24")}>
      {/* Header - Compact on mobile */}
      <div className={cn("flex items-center justify-between", isMobile && "flex-col items-start gap-3")}>
        <div>
          <h2 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>{t('outfitSwap.batch.title')}</h2>
          <p className={cn("text-muted-foreground", isMobile && "text-sm")}>
            {t('outfitSwap.batch.completedOf', { completed: batch.completed_jobs, total: batch.total_jobs })}
            {batch.failed_jobs > 0 && ` • ${t('outfitSwap.batch.failed', { count: batch.failed_jobs })}`}
            {!isMobile && (isAdmin ? ` • ${t('outfitSwap.batch.adminUnlimited')}` : creditsUsed > 0 && ` • ${t('outfitSwap.batch.creditsUsed', { count: creditsUsed })}`)}
          </p>
        </div>
        <div className={cn("flex gap-2", isMobile && "w-full")}>
          {isProcessing && (
            <Button variant="outline" onClick={onCancel} className={cn(isMobile && "flex-1")}>
              <X className="w-4 h-4 mr-2" />
              {isMobile ? t('outfitSwap.actions.cancel') : t('outfitSwap.actions.cancelBatch')}
            </Button>
          )}
          {/* Desktop header actions - hide on mobile, show in sticky footer */}
          {!isMobile && (isCompleted || isFailed) && (
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
                {t('outfitSwap.actions.refresh')}
              </Button>
              {batch.completed_jobs > 0 && (
                <Button onClick={downloadAll}>
                  <Download className="w-4 h-4 mr-2" />
                  {t('outfitSwap.actions.downloadAll')}
                </Button>
              )}
              <Button variant="outline" onClick={onReset}>
                {t('outfitSwap.actions.startNewBatch')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      <Card className="p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{t('outfitSwap.batch.overallProgress')}</span>
            <Badge
              variant={
                isCompleted
                  ? "default"
                  : isFailed
                  ? "destructive"
                  : "secondary"
              }
            >
              {t(`outfitSwap.status.${batch.status}`)}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">{progress}% complete</p>
        </div>
      </Card>

      {/* Jobs Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('outfitSwap.batch.individualSwaps')}</h3>
        <ScrollArea className="h-[800px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job, index) => {
              const result = results[job.id];
              const isStuck = job.status === "processing" && 
                new Date().getTime() - new Date(job.created_at || Date.now()).getTime() > 120000; // 2 minutes

              return (
                <Card key={job.id} className="overflow-hidden h-max">
                  <div className="aspect-[9/16] sm:aspect-square md:aspect-[3/4] relative bg-muted">
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
                  <div className="p-4 h-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{t('outfitSwap.batch.swap', { index: index + 1 })}</span>
                      {getJobIcon(job.status)}
                    </div>
                    {job.progress > 0 && job.status === "processing" && (
                      <Progress value={job.progress} className="h-1 mb-2" />
                    )}
                    {job.error && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-destructive font-medium">
                          {job.error}
                        </p>
                        {job.metadata?.error_type === "rate_limit" && (
                          <p className="text-xs text-muted-foreground">
                            {t('outfitSwap.errorMessages.rateLimit')}
                          </p>
                        )}
                        {job.metadata?.error_type === "auth_error" && (
                          <p className="text-xs text-muted-foreground">
                            {t('outfitSwap.errorMessages.authError')}
                          </p>
                        )}
                        {job.metadata?.error_type === "server_error" && (
                          <p className="text-xs text-muted-foreground">
                            {t('outfitSwap.errorMessages.serverError')}
                          </p>
                        )}
                      </div>
                    )}
                    {job.status === "failed" && onRetryJob && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => onRetryJob(job.id)}
                        disabled={retryingJobs.has(job.id)}
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${retryingJobs.has(job.id) ? 'animate-spin' : ''}`} />
                        {retryingJobs.has(job.id) ? t('outfitSwap.buttons.retrying') : t('outfitSwap.buttons.retry')}
                      </Button>
                    )}
                    {isStuck && (
                      <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md mt-2">
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          {t('outfitSwap.warnings.stuckJob')}
                        </p>
                      </div>
                    )}
                    {result && (
                      <div className="space-y-3 mt-3">
                        {/* Featured Photoshoot CTA - Full Width, Highlighted */}
                        <Button
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg h-12"
                          onClick={() => handleCreatePhotoshoot(result)}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          <span className="flex-1 text-left font-semibold">
                            {t('outfitSwap.buttons.createPhotoshoot')}
                          </span>
                          <Badge variant="secondary" className="ml-2 text-xs bg-white/20 text-white border-0">
                            7 {t('outfitSwap.buttons.angles')}
                          </Badge>
                        </Button>

                        {/* Primary actions - compact grid */}
                        <div className={cn(
                          "grid gap-2",
                          isMobile ? "grid-cols-2" : "grid-cols-2"
                        )}>
                          {/* <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewImage({ url: result.public_url, name: t('outfitSwap.batch.swap', { index: index + 1 }) })}
                            className="flex-col h-auto py-2"
                          >
                            <Eye className="w-4 h-4 mb-1" />
                            <span className="text-xs">{t('outfitSwap.buttons.preview')}</span>
                          </Button> */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openInNewTab(result.public_url)}
                            className="flex-col h-auto py-2"
                          >
                            <ExternalLink className="w-4 h-4 mb-1" />
                            <span className="text-xs">{t('outfitSwap.buttons.open')}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadImage(result.public_url, job.id)}
                            className="flex-col h-auto py-2"
                          >
                            <Download className="w-4 h-4 mb-1" />
                            <span className="text-xs">{t('outfitSwap.buttons.download')}</span>
                          </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAnimate(result.public_url, result)}
                              className="flex-col h-auto py-2"
                            >
                              <Film className="w-4 h-4 mb-1" />
                              <span className="text-xs">{t('outfitSwap.buttons.animate')}</span>
                            </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCreateEcommercePhoto(result)}
                            className="flex-col h-auto py-2"
                          >
                            <ShoppingBag className="w-3 h-3 mr-1" />
                            {t('outfitSwap.buttons.ecommerce')}
                          </Button>
                        </div>
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

      {photoshootModal.resultId && (
        <PhotoshootModal
          isOpen={photoshootModal.isOpen}
          onClose={() => setPhotoshootModal({ isOpen: false, resultId: null, originalImageUrl: null })}
          resultId={photoshootModal.resultId}
          originalImageUrl={photoshootModal.originalImageUrl || ""}
        />
      )}

      {ecommerceIdeasModal.resultId && (
        <EcommerceIdeasModal
          isOpen={ecommerceIdeasModal.isOpen}
          onClose={() => setEcommerceIdeasModal({ isOpen: false, resultId: null, imageUrl: null })}
          imageUrl={ecommerceIdeasModal.imageUrl || ""}
          onSelectIdea={(idea) => handleEcommerceIdeaSelected(idea, ecommerceIdeasModal.resultId!)}
        />
      )}

      {ecommercePhotoModal.photoId && (
        <EcommercePhotoModal
          isOpen={ecommercePhotoModal.isOpen}
          onClose={() => setEcommercePhotoModal({ isOpen: false, photoId: null, originalImageUrl: null })}
          photoId={ecommercePhotoModal.photoId}
          originalImageUrl={ecommercePhotoModal.originalImageUrl || ""}
        />
      )}

      <AnimateImageModal
        open={animateModal.open}
        onClose={() => setAnimateModal({ open: false, imageUrl: null, imageId: null })}
        imageUrl={animateModal.imageUrl}
        imageId={animateModal.imageId}
      />

      {/* Mobile Sticky Footer */}
      {isMobile && (isCompleted || isFailed) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50">
          <div className="flex gap-2 max-w-md mx-auto">
            <Button
              className="flex-1"
              onClick={async () => {
                if (onRefresh) {
                  await onRefresh();
                }
                await refreshResults();
              }}
              disabled={isRefreshing || loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
            {batch.completed_jobs > 0 && (
              <Button className="flex-1" onClick={downloadAll}>
                <Download className="w-4 h-4 mr-2" />
                {t('outfitSwap.actions.downloadAll')}
              </Button>
            )}
            <Button variant="outline" onClick={onReset} className="flex-1">
              {t('outfitSwap.actions.newBatch')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
