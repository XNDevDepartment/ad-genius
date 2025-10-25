import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Images, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "@/hooks/use-toast";
import MultiImageUploader from "@/components/MultiImageUploader";
import { ProductStudioSettings } from "@/components/ProductStudioSettings";
import { StudioSettings } from "./ProductStudioBackground";

const ProductStudioBackgroundBulk = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const [step, setStep] = useState(1);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [settings, setSettings] = useState<StudioSettings>({
    backgroundType: "white",
    shadowStyle: "soft",
    lighting: "neutral",
    outputFormat: "png"
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "This module is only available for admins",
        variant: "destructive"
      });
      navigate("/create");
    }
  }, [isAdmin, adminLoading, navigate]);

  const handleImagesUpload = (files: File[]) => {
    setProductImages(files);
    setStep(2);
  };

  const handleBatchProcess = () => {
    setIsProcessing(true);
    setProcessedCount(0);
    
    toast({
      title: "Backend Integration Coming Soon",
      description: "Bulk processing will be available soon"
    });

    // Simulate processing
    const interval = setInterval(() => {
      setProcessedCount(prev => {
        if (prev >= productImages.length - 1) {
          clearInterval(interval);
          setIsProcessing(false);
          return productImages.length;
        }
        return prev + 1;
      });
    }, 500);
  };

  const totalCost = productImages.length * 0; // Placeholder
  const canProcess = productImages.length > 0;

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Images className="h-8 w-8 text-orange-500" />
              Product Studio Bulk Processing
              <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">ADMIN</span>
            </h1>
            <p className="text-muted-foreground">
              Process multiple products at once with batch background replacement
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full transition-colors ${
                step >= s ? "bg-orange-500" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Upload Multiple */}
            {step >= 1 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-sm">1</span>
                  Upload Product Images (Max 20)
                </h2>
                <MultiImageUploader
                  onImagesSelect={handleImagesUpload}
                  selectedImages={productImages}
                  maxImages={20}
                />
                {productImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      {productImages.length} images uploaded
                    </p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {productImages.map((file, idx) => (
                        <img
                          key={idx}
                          src={URL.createObjectURL(file)}
                          alt={`Product ${idx + 1}`}
                          className="w-full aspect-square object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Step 2: Settings */}
            {step >= 2 && productImages.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-sm">2</span>
                  Apply Settings to All
                </h2>
                <ProductStudioSettings
                  settings={settings}
                  onSettingsChange={(updates) => {
                    setSettings({ ...settings, ...updates });
                    if (step < 3) setStep(3);
                  }}
                />
              </Card>
            )}

            {/* Step 3-4: Process */}
            {step >= 3 && canProcess && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-sm">
                    {isProcessing ? 3 : 4}
                  </span>
                  {isProcessing ? "Processing Batch..." : "Start Batch Processing"}
                </h2>
                
                {isProcessing && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{processedCount} / {productImages.length}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${(processedCount / productImages.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleBatchProcess}
                  disabled={!canProcess || isProcessing}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing {processedCount}/{productImages.length}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Start Batch Processing
                    </>
                  )}
                </Button>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Total Cost</h3>
              <p className="text-2xl font-bold text-orange-500">{totalCost} credits</p>
              <p className="text-xs text-muted-foreground mt-1">
                {productImages.length} images × 0 credits each
              </p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Bulk Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Upload similar products for best results</li>
                <li>• Same settings applied to all images</li>
                <li>• Download as ZIP when complete</li>
                <li>• Processing time: ~2-3s per image</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductStudioBackgroundBulk;
