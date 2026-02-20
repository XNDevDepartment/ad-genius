import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Upload, AlertCircle, Images, Link, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { GarmentLibraryPicker } from "./GarmentLibraryPicker";
import { BulkUrlImportModal } from "./BulkUrlImportModal";
import { ShopifyImportModal } from "./ShopifyImportModal";
import { SourceImage } from "@/hooks/useSourceImages";
import { supabase } from "@/integrations/supabase/client";

interface MultiGarmentUploaderProps {
  garments: File[];
  garmentDetails: Record<number, string>;
  onGarmentsChange: (garments: File[], details: Record<number, string>) => void;
  maxGarments?: number;
  onSourceImagesImported?: (imageIds: string[]) => void;
}

export const MultiGarmentUploader = ({
  garments,
  garmentDetails,
  onGarmentsChange,
  maxGarments = 10,
  onSourceImagesImported,
}: MultiGarmentUploaderProps) => {
  const { t } = useTranslation();
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [urlImportOpen, setUrlImportOpen] = useState(false);
  const [shopifyImportOpen, setShopifyImportOpen] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const combined = [...garments, ...newFiles].slice(0, maxGarments);
    onGarmentsChange(combined, garmentDetails);

    // Generate previews
    combined.forEach((file, index) => {
      if (index >= previews.length) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeGarment = (index: number) => {
    const newGarments = garments.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    const newDetails = { ...garmentDetails };
    delete newDetails[index];
    // Re-index remaining details
    const reindexedDetails: Record<number, string> = {};
    Object.entries(newDetails).forEach(([key, value]) => {
      const oldIndex = parseInt(key);
      if (oldIndex > index) {
        reindexedDetails[oldIndex - 1] = value;
      } else {
        reindexedDetails[oldIndex] = value;
      }
    });
    onGarmentsChange(newGarments, reindexedDetails);
    setPreviews(newPreviews);
  };

  const handleDetailChange = (index: number, detail: string) => {
    const newDetails = { ...garmentDetails, [index]: detail };
    onGarmentsChange(garments, newDetails);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Handle library selection - convert SourceImages to Files
  const handleLibrarySelect = async (images: SourceImage[]) => {
    const newFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    for (const image of images) {
      try {
        const response = await fetch(image.signedUrl);
        const blob = await response.blob();
        const fileName = image.fileName || `garment-${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: blob.type });
        newFiles.push(file);
        newPreviewUrls.push(image.signedUrl);
      } catch (error) {
        console.error('Failed to fetch image:', error);
      }
    }

    if (newFiles.length > 0) {
      const combined = [...garments, ...newFiles].slice(0, maxGarments);
      onGarmentsChange(combined, garmentDetails);
      setPreviews((prev) => [...prev, ...newPreviewUrls].slice(0, maxGarments));
    }
  };

  // Handle URL import completion - fetch the imported images and convert to Files
  const handleUrlImportComplete = async (imageIds: string[]) => {
    setUrlImportOpen(false);
    
    // Fetch the imported source images
    const { data: sourceImages, error } = await supabase
      .from('source_images')
      .select('id, storage_path, file_name, public_url')
      .in('id', imageIds);

    if (error || !sourceImages) return;

    const newFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    for (const img of sourceImages) {
      try {
        // Get signed URL with smart bucket detection
        const bucket = img.public_url?.includes('/ugc-inputs/') ? 'ugc-inputs' : 'source-images';
        const { data: signedData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(img.storage_path, 3600);

        if (signedData?.signedUrl) {
          const response = await fetch(signedData.signedUrl);
          const blob = await response.blob();
          const file = new File([blob], img.file_name || `garment-${Date.now()}.jpg`, { type: blob.type });
          newFiles.push(file);
          newPreviewUrls.push(signedData.signedUrl);
        }
      } catch (error) {
        console.error('Failed to fetch imported image:', error);
      }
    }

    if (newFiles.length > 0) {
      const combined = [...garments, ...newFiles].slice(0, maxGarments);
      onGarmentsChange(combined, garmentDetails);
      setPreviews((prev) => [...prev, ...newPreviewUrls].slice(0, maxGarments));
    }

    onSourceImagesImported?.(imageIds);
  };

  // Handle Shopify import completion
  const handleShopifyImportComplete = async (imageIds: string[]) => {
    setShopifyImportOpen(false);
    await handleUrlImportComplete(imageIds);
  };

  return (
    <div className="space-y-4">
      {/* Import Options */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLibraryPickerOpen(true)}
          disabled={garments.length >= maxGarments}
        >
          <Images className="w-4 h-4 mr-2" />
          {t('outfitSwap.garmentUploader.importFromLibrary', 'From Library')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUrlImportOpen(true)}
          disabled={garments.length >= maxGarments}
        >
          <Link className="w-4 h-4 mr-2" />
          {t('outfitSwap.garmentUploader.importFromUrl', 'From URL')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShopifyImportOpen(true)}
          disabled={garments.length >= maxGarments}
        >
          <Store className="w-4 h-4 mr-2" />
          {t('outfitSwap.garmentUploader.importFromShopify', 'From Shopify')}
        </Button>
      </div>

      {/* Uploaded Garments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {garments.length > 0 && (
          <>
            {garments.map((garment, index) => (
              <Card key={index} className="relative group overflow-hidden p-4 space-y-3">
                <div className="relative aspect-square rounded-md overflow-hidden align-middle">
                  <img
                    src={previews[index]}
                    alt={`Garment ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeGarment(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                    {index + 1}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('outfitSwap.garmentUploader.detailsLabel')}
                  </label>
                  <textarea
                    value={garmentDetails[index] || ""}
                    onChange={(e) => handleDetailChange(index, e.target.value)}
                    placeholder={t('outfitSwap.garmentUploader.detailsPlaceholder')}
                    className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {(garmentDetails[index] || "").length}/200
                  </p>
                </div>
              </Card>
            ))}
          </>
        )}
        {garments.length < maxGarments && (
          <Card
            className={cn(
              "border-2 border-dashed transition-all cursor-pointer hover:border-primary align-middle",
              isDragOver && "border-primary bg-primary/5"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("garment-upload")?.click()}
          >
            <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('outfitSwap.garmentUploader.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('outfitSwap.garmentUploader.dragDrop')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('outfitSwap.garmentUploader.selected', { count: garments.length, max: maxGarments })}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Info */}
      {garments.length >= 5 && (
        <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>
            {t('outfitSwap.garmentUploader.discount', { count: garments.length })}
          </p>
        </div>
      )}

      <input
        id="garment-upload"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Modals */}
      <GarmentLibraryPicker
        open={libraryPickerOpen}
        onClose={() => setLibraryPickerOpen(false)}
        onSelect={handleLibrarySelect}
        maxImages={maxGarments}
        currentCount={garments.length}
      />

      <BulkUrlImportModal
        open={urlImportOpen}
        onClose={() => setUrlImportOpen(false)}
        onImportComplete={handleUrlImportComplete}
        maxImages={maxGarments}
        currentCount={garments.length}
      />

      <ShopifyImportModal
        open={shopifyImportOpen}
        onOpenChange={setShopifyImportOpen}
        onImportComplete={handleShopifyImportComplete}
      />
    </div>
  );
};
