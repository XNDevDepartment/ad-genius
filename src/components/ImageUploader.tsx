import { useRef, useState, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  onImageSelect: (file: File | null) => void;
  selectedImage: File | null;
}

const ImageUploader = ({ onImageSelect, selectedImage }: ImageUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (selectedImage) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedImage);
    } else {
      setImagePreview(null);
    }
  }, [selectedImage]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  const handleRemoveImage = () => {
    onImageSelect(null);
    setImagePreview(null);
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
    
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      onImageSelect(files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Product Image
      </label>
      
      {selectedImage && imagePreview ? (
        <div className="relative bg-card border-2 border-border rounded-apple overflow-hidden">
          <img 
            src={imagePreview} 
            alt="Product preview" 
            className="w-full h-48 object-contain"
          />
          <div className="absolute top-2 right-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleRemoveImage}
              className="h-8 w-8 bg-background/80 backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-3 bg-background/95 backdrop-blur-sm">
            <p className="text-sm font-medium text-foreground">
              {selectedImage.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full bg-card border-2 border-dashed rounded-apple p-8 transition-colors ${
            isDragOver 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-apple-sm flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isDragOver ? 'Drop your image here' : 'Upload Product Image'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isDragOver ? 'Release to upload' : 'PNG, JPG up to 10MB • Click or drag & drop'}
              </p>
            </div>
          </div>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ImageUploader;