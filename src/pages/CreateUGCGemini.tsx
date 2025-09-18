import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, Loader2, Images, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import ImageUploader from "@/components/ImageUploader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { SourceImagePicker } from "@/components/SourceImagePicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { SourceImage } from "@/hooks/useSourceImages";

const CreateUGCGemini = () => {
  const { t } = useTranslation();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [productImage, setProductImage] = useState<File | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [sourceImagePickerOpen, setSourceImagePickerOpen] = useState(false);
  const [urlImportOpen, setUrlImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importingFromUrl, setImportingFromUrl] = useState(false);

  // Block access if not authenticated or not admin
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, adminLoading, navigate]);

  // Show loading while checking admin status
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  const handleImageUpload = async (file: File | null) => {
    if (!file) {
      setProductImage(null);
      return;
    }

    setProductImage(file);
    setIsAnalyzingImage(true);
    
    // Placeholder analysis
    setTimeout(() => {
      setIsAnalyzingImage(false);
      toast({
        title: "Gemini Analysis Complete",
        description: "Product analyzed with Gemini Nano Banana 2.5 (mock analysis)",
        variant: "default",
      });
    }, 2000);
  };

  const handleSourceImageSelect = async (image: SourceImage) => {
    try {
      // Create signed URL and fetch the image
      const response = await fetch(image.signedUrl);
      const blob = await response.blob();

      // Convert blob to File object
      const file = new File([blob], image.fileName, { type: blob.type });

      // Set as product image
      setProductImage(file);
      setSourceImagePickerOpen(false);

      // Start AI analysis
      setIsAnalyzingImage(true);
      setTimeout(() => {
        setIsAnalyzingImage(false);
        toast({
          title: "Image Loaded",
          description: "Selected image from your library and analyzed with Gemini.",
        });
      }, 1500);

    } catch (error) {
      console.error('Error selecting source image:', error);
      toast({
        title: "Error",
        description: "Failed to load the selected image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter a valid image URL.",
        variant: "destructive",
      });
      return;
    }

    try {
      setImportingFromUrl(true);

      const { data, error } = await supabase.functions.invoke('upload-source-image-from-url', {
        body: { imageUrl: importUrl.trim() }
      });

      if (error) {
        throw new Error(error.message || 'Failed to import image from URL');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to import image from URL');
      }

      toast({
        title: "Image Imported",
        description: "Image successfully imported from URL and ready for analysis.",
      });

      setImportUrl("");
      setUrlImportOpen(false);

      // Convert the imported image to File object for analysis
      const response = await fetch(data.url);
      const blob = await response.blob();
      const file = new File([blob], data.fileName, { type: blob.type });
      
      handleImageUpload(file);

    } catch (error) {
      console.error('Error importing from URL:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import image from URL. Please try again.",
        variant: "destructive",
      });
    } finally {
      setImportingFromUrl(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Admin Badge */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          Gemini Nano Banana 2.5 (Admin Only)
        </div>
      </div>

      <div className="px-4 sm:px-6 max-w-4xl mx-auto pt-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="text-center flex-1 mx-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Gemini UGC Creator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Admin testing environment for Google Gemini Nano Banana 2.5
            </p>
          </div>

          <div className="w-10" /> {/* Spacer for balance */}
        </div>

        {/* Product Image Upload Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="product-image" className="text-base font-medium mb-3 block">
                  Product Image
                  <span className="text-muted-foreground text-sm block font-normal">
                    Upload your product image for Gemini analysis
                  </span>
                </Label>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <ImageUploader 
                      onImageSelect={handleImageUpload}
                      selectedImage={productImage}
                      isAnalyzing={isAnalyzingImage}
                      analyzingText="Analyzing with Gemini..."
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSourceImagePickerOpen(true)}
                    className="h-10 w-10 shrink-0"
                  >
                    <Images className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setUrlImportOpen(true)}
                    className="h-10 w-10 shrink-0"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder message */}
        <Card className="mb-6">
          <CardContent className="pt-6 text-center">
            <Sparkles className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Gemini Integration Coming Soon</h3>
            <p className="text-muted-foreground mb-4">
              This admin panel is ready for Google Gemini Nano Banana 2.5 integration.
              The UI is fully functional, waiting for API implementation.
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Admin-only access control</p>
              <p>✓ Image upload and analysis UI</p>
              <p>✓ Source image library integration</p>
              <p>✓ URL import functionality</p>
              <p>⏳ Gemini API integration pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Image Picker Modal */}
      <SourceImagePicker
        open={sourceImagePickerOpen}
        onClose={() => setSourceImagePickerOpen(false)}
        onSelect={handleSourceImageSelect}
      />

      {/* URL Import Dialog */}
      <Dialog open={urlImportOpen} onOpenChange={setUrlImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Image from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-url">Image URL</Label>
              <Input
                id="import-url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={importingFromUrl}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleImportFromUrl}
                disabled={!importUrl.trim() || importingFromUrl}
                className="flex-1"
              >
                {importingFromUrl ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Image'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setUrlImportOpen(false);
                  setImportUrl("");
                }}
                disabled={importingFromUrl}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateUGCGemini;