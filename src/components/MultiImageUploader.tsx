import { useRef, useState, useEffect } from "react";
import { Upload, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface MultiImageUploaderProps {
  onImagesSelect: (files: File[]) => void;
  selectedImages: File[];
  isAnalyzing?: boolean[];
  analyzingText?: string;
  maxImages?: number;
}

const MultiImageUploader = ({ 
  onImagesSelect, 
  selectedImages, 
  isAnalyzing = [], 
  analyzingText = "Analyzing images...",
  maxImages = 5 
}: MultiImageUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (selectedImages.length === 0) {
      setImagePreviews([]);
      return;
    }

    // Create preview URLs for all selected images using Promise.all to avoid race conditions
    const createPreviews = async () => {
      const previewPromises = selectedImages.map((file, index) => {
        return new Promise<{ index: number; preview: string }>((resolve, reject) => {
          if (!file) {
            resolve({ index, preview: '' });
            return;
          }
          
          const reader = new FileReader();
          reader.onload = () => resolve({ index, preview: reader.result as string });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      try {
        const results = await Promise.all(previewPromises);
        const previews = new Array(selectedImages.length);
        results.forEach(({ index, preview }) => {
          previews[index] = preview;
        });
        setImagePreviews(previews);
      } catch (error) {
        console.error('Error creating image previews:', error);
        setImagePreviews([]);
      }
    };

    createPreviews();
  }, [selectedImages]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const validFiles = files.filter(file => file.type.startsWith('image/'));
      const totalFiles = selectedImages.length + validFiles.length;
      
      if (totalFiles > maxImages) {
        const remainingSlots = maxImages - selectedImages.length;
        const newFiles = [...selectedImages, ...validFiles.slice(0, remainingSlots)];
        onImagesSelect(newFiles);
      } else {
        onImagesSelect([...selectedImages, ...validFiles]);
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    onImagesSelect(newImages);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => file.type.startsWith('image/'));

    if (validFiles.length > 0) {
      const totalFiles = selectedImages.length + validFiles.length;

      if (totalFiles > maxImages) {
        const remainingSlots = maxImages - selectedImages.length;
        const newFiles = [...selectedImages, ...validFiles.slice(0, remainingSlots)];
        onImagesSelect(newFiles);
      } else {
        onImagesSelect([...selectedImages, ...validFiles]);
      }
    }
  };

  const canAddMore = selectedImages.length < maxImages;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Uploaded Images Grid */}
      {selectedImages.length > 0 && (
        <>
          {selectedImages.map((file, index) => (
            <Card key={index} className="relative bg-transparent border-2 border-border rounded-apple overflow-hidden">
              {imagePreviews[index] && (
                <img
                  src={imagePreviews[index]} 
                  alt={`Product preview ${index + 1}`} 
                  className="w-full h-48 object-cover"
                />
              )}

              {isAnalyzing[index] && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary-glow/30 to-primary/20 animate-grain flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center text-white">
                    <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm font-medium">{analyzingText}</p>
                  </div>
                </div>
              )}

              <div className="absolute top-2 right-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => handleRemoveImage(index)}
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

            </Card>
          ))}
          </>
        )}

      {/* Upload Area */}
      {canAddMore && (
        <button
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={` bg-transparent border-2 border-dashed rounded-apple p-8 transition-colors ${
          isDragOver 
          ? 'border-primary bg-primary/5 scale-[1.02]' 
          : 'border-border hover:border-primary/50'
        } ${selectedImages.length > 0 ? '' : 'w-full col-span-3 col-span-auto'}`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-apple-sm flex items-center justify-center">
              {selectedImages.length > 0 ? (
                <Plus className="h-6 w-6 text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isDragOver 
                  ? 'Drop your images here' 
                  : selectedImages.length > 0 
                  ? `Add More Images (${selectedImages.length}/${maxImages})`
                  : 'Upload Product Images'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {isDragOver 
                  ? 'Release to upload' 
                  : `PNG, JPG up to 10MB each • Max ${maxImages} images • Click or drag & drop`
                }
              </p>
            </div>
          </div>
        </button>
      )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default MultiImageUploader;