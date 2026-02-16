import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, Loader2, Download, Eye, Check, Camera } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { productViewsApi, ProductViews } from "@/api/product-views-api";
import { useToast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";

interface ProductViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultId: string;
  resultUrl: string;
  aspectRatio?: string;
}

const VIEW_OPTIONS = [
  { id: "macro", label: "Macro View", description: "Close-up focusing on material and texture" },
  { id: "environment", label: "Environment View", description: "Product in realistic use environment" },
  { id: "angle", label: "3/4 Angle View", description: "Angled catalog-style product photo" },
] as const;

type ViewType = typeof VIEW_OPTIONS[number]["id"];

export const ProductViewsModal = ({ isOpen, onClose, resultId, resultUrl, aspectRatio }: ProductViewsModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getRemainingCredits, refreshCredits } = useCredits();

  const [selectedViews, setSelectedViews] = useState<Set<ViewType>>(new Set(["macro", "environment", "angle"]));
  const [productViews, setProductViews] = useState<ProductViews | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Check for existing product views when modal opens
  useEffect(() => {
    if (!isOpen || !resultId) return;
    setCheckingExisting(true);
    productViewsApi.getByResult(resultId).then(({ productViews: existing }) => {
      if (isMountedRef.current) {
        if (existing && existing.status !== 'failed') {
          setProductViews(existing);
        } else {
          setProductViews(null);
        }
        setCheckingExisting(false);
      }
    }).catch(() => {
      if (isMountedRef.current) setCheckingExisting(false);
    });
  }, [isOpen, resultId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!productViews?.id) return;
    if (productViews.status === 'completed' || productViews.status === 'failed') return;

    const unsub = productViewsApi.subscribeProductViews(productViews.id, (updated) => {
      if (!isMountedRef.current) return;
      setProductViews(updated);
      if (updated.status === 'completed') {
        toast({ title: "Product views ready!" });
        refreshCredits();
      } else if (updated.status === 'failed') {
        toast({ title: "Generation failed", description: updated.error, variant: "destructive" });
      }
    });

    return unsub;
  }, [productViews?.id, productViews?.status, toast, refreshCredits]);

  // Polling fallback
  useEffect(() => {
    if (!productViews?.id || productViews.status === 'completed' || productViews.status === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const { productViews: updated } = await productViewsApi.get(productViews.id);
        if (isMountedRef.current) setProductViews(updated);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [productViews?.id, productViews?.status]);

  const toggleView = (view: ViewType) => {
    setSelectedViews(prev => {
      const next = new Set(prev);
      if (next.has(view)) next.delete(view);
      else next.add(view);
      return next;
    });
  };

  const handleCreate = useCallback(async () => {
    if (selectedViews.size === 0) return;
    setLoading(true);
    try {
      const { productViewsId } = await productViewsApi.create(resultId, Array.from(selectedViews), aspectRatio);
      const { productViews: created } = await productViewsApi.get(productViewsId);
      if (isMountedRef.current) {
        setProductViews(created);
        refreshCredits();
      }
    } catch (err) {
      toast({
        title: "Failed to create product views",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [resultId, selectedViews, toast, refreshCredits]);

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${name}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch { console.error('Download error'); }
  };

  const credits = getRemainingCredits();
  const cost = selectedViews.size;
  const hasEnough = credits >= cost;
  const isProcessing = productViews?.status === 'queued' || productViews?.status === 'processing';
  const isComplete = productViews?.status === 'completed';

  const getViewUrl = (viewType: string) => {
    if (!productViews) return null;
    switch (viewType) {
      case 'macro': return productViews.macro_url;
      case 'environment': return productViews.environment_url;
      case 'angle': return productViews.angle_url;
    }
    return null;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 md:p-0">
          {/* Header */}
          <div className="sticky top-0 bg-background z-10 p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Create Photoshoot</h2>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {checkingExisting ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !productViews || productViews.status === 'failed' ? (
              /* SELECTION STAGE */
              <>
                {/* Source preview */}
                <div className="flex justify-center">
                  <img src={resultUrl} alt="Source" className="max-h-48 rounded-lg object-contain" />
                </div>

                {/* View selection */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Select views to generate:</p>
                  {VIEW_OPTIONS.map((view) => (
                    <label
                      key={view.id}
                      className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedViews.has(view.id)}
                        onCheckedChange={() => toggleView(view.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-medium text-sm">{view.label}</p>
                        <p className="text-xs text-muted-foreground">{view.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Cost & CTA */}
                <div className="sticky bottom-0 bg-background pt-3 border-t space-y-2">
                  <Button
                    onClick={handleCreate}
                    disabled={selectedViews.size === 0 || !hasEnough || loading}
                    className="w-full gap-2"
                    variant="alternative"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Create Photoshoot — {cost} credit{cost !== 1 ? 's' : ''}
                  </Button>
                  {!hasEnough && (
                    <p className="text-xs text-destructive text-center">
                      Not enough credits ({credits} available)
                    </p>
                  )}
                </div>
              </>
            ) : isProcessing ? (
              /* PROCESSING STAGE */
              <div className="space-y-6 py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <Progress value={productViews.progress} className="h-3" />
                <p className="text-center text-sm text-muted-foreground">
                  Generating product views... {productViews.progress}%
                </p>
              </div>
            ) : isComplete ? (
              /* RESULTS STAGE */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(productViews.selected_views as string[]).map((viewType) => {
                    const url = getViewUrl(viewType);
                    const label = VIEW_OPTIONS.find(v => v.id === viewType)?.label || viewType;
                    return (
                      <div key={viewType} className="space-y-2">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                          {url ? (
                            <img src={url} alt={label} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <X className="h-6 w-6 text-destructive" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium text-center">{label}</p>
                        {url && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-1"
                              onClick={() => setPreviewImage(url)}
                            >
                              <Eye className="h-3 w-3" />
                              <span className="text-xs">Preview</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-1"
                              onClick={() => handleDownload(url, `${viewType}-view`)}
                            >
                              <Download className="h-3 w-3" />
                              <span className="text-xs">Save</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {productViews.error && (
                  <p className="text-xs text-destructive text-center">{productViews.error}</p>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage || ''}
        imageName="Product View"
        onOpenInNewTab={() => previewImage && window.open(previewImage, '_blank')}
      />
    </>
  );
};
