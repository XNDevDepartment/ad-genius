import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Upload, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MultiGarmentUploaderProps {
  garments: File[];
  onGarmentsChange: (garments: File[]) => void;
  maxGarments?: number;
}

export const MultiGarmentUploader = ({
  garments,
  onGarmentsChange,
  maxGarments = 10,
}: MultiGarmentUploaderProps) => {
  const { t } = useTranslation();
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const combined = [...garments, ...newFiles].slice(0, maxGarments);
    onGarmentsChange(combined);

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
    onGarmentsChange(newGarments);
    setPreviews(newPreviews);
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

  return (
    <div className="space-y-4">
      {/* Uploaded Garments Grid */}
      {garments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {garments.map((garment, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <div className="aspect-square">
                <img
                  src={previews[index]}
                  alt={`Garment ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeGarment(index)}
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                {index + 1}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {garments.length < maxGarments && (
        <Card
          className={cn(
            "border-2 border-dashed transition-all cursor-pointer hover:border-primary",
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
    </div>
  );
};
