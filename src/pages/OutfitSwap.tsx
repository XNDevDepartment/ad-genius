import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useOutfitSwap } from "@/hooks/useOutfitSwap";
import { useToast } from "@/hooks/use-toast";
import ImageUploader from "@/components/ImageUploader";
import { OutfitSwapSettings } from "@/components/OutfitSwapSettings";
import { OutfitSwapPreview } from "@/components/OutfitSwapPreview";
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";

const OutfitSwap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const { toast } = useToast();
  const { job, results, loading, stage, createJob, cancelJob, reset } = useOutfitSwap();

  const [personImageFile, setPersonImageFile] = useState<File | null>(null);
  const [garmentImageFile, setGarmentImageFile] = useState<File | null>(null);
  const [personImage, setPersonImage] = useState<{ id: string; url: string } | null>(null);
  const [garmentImage, setGarmentImage] = useState<{ id: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const { uploadSourceImage } = useSourceImageUpload();
  const [settings, setSettings] = useState({
    outputFormat: "both" as "jpg" | "png" | "both",
  });

  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate("/");
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Admin access required for Outfit Swap module",
      });
    }
  }, [user, isAdmin, adminLoading, navigate, toast]);

  const handleStartSwap = async () => {
    if (!personImageFile || !garmentImageFile) {
      toast({
        variant: "destructive",
        title: "Missing images",
        description: "Please upload both a person photo and a garment photo",
      });
      return;
    }

    try {
      setUploading(true);

      // Upload person image if not already uploaded
      let personImgId = personImage?.id;
      let personImgUrl = personImage?.url;
      if (!personImgId) {
        const uploadedPerson = await uploadSourceImage(personImageFile);
        personImgId = uploadedPerson.id;
        personImgUrl = uploadedPerson.publicUrl;
        setPersonImage({ id: personImgId, url: personImgUrl });
      }

      // Upload garment image if not already uploaded
      let garmentImgId = garmentImage?.id;
      if (!garmentImgId) {
        const uploadedGarment = await uploadSourceImage(garmentImageFile);
        garmentImgId = uploadedGarment.id;
        setGarmentImage({ id: garmentImgId, url: uploadedGarment.publicUrl });
      }

      // Start the swap job
      await createJob(personImgId, garmentImgId, settings);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload images",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    reset();
    setPersonImageFile(null);
    setGarmentImageFile(null);
    setPersonImage(null);
    setGarmentImage(null);
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shirt className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Outfit Swap</h1>
              <p className="text-sm text-muted-foreground">
                AI-powered outfit replacement (Admin Only)
              </p>
            </div>
          </div>
        </div>

        {/* Setup Stage */}
        {stage === "setup" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Person Image Upload */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">1. Upload Person Photo</h3>
                <ImageUploader
                  onImageSelect={(file) => {
                    setPersonImageFile(file);
                    if (!file) setPersonImage(null);
                  }}
                  selectedImage={personImageFile}
                />
              </div>

              {/* Garment Image Upload */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">2. Upload Garment Photo</h3>
                <p className="text-sm text-muted-foreground">
                  Flat lay or model on white background works best
                </p>
                <ImageUploader
                  onImageSelect={(file) => {
                    setGarmentImageFile(file);
                    if (!file) setGarmentImage(null);
                  }}
                  selectedImage={garmentImageFile}
                />
              </div>
            </div>

            {/* Settings */}
            <OutfitSwapSettings settings={settings} onChange={setSettings} />

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleStartSwap}
                disabled={!personImageFile || !garmentImageFile || loading || uploading}
                className="min-w-[200px]"
              >
                {uploading ? "Uploading..." : loading ? "Starting..." : "Swap Outfit"}
              </Button>
            </div>
          </div>
        )}

        {/* Processing/Results Stage */}
        {(stage === "processing" || stage === "results") && job && (
          <OutfitSwapPreview
            job={job}
            results={results}
            onCancel={cancelJob}
            onReset={handleReset}
            personImageUrl={personImage?.url || ""}
          />
        )}
      </div>
    </div>
  );
};

export default OutfitSwap;
