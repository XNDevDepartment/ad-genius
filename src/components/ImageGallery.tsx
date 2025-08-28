import { useState } from "react";
import { Check, Star, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  selected: boolean;
}

interface ImageGalleryProps {
  images: GeneratedImage[];
  onImageSelect: (imageId: string) => void;
}

const ImageGallery = ({ images, onImageSelect }: ImageGalleryProps) => {
  const { favorites, toggleFavorite } = useFavorites();

  // const handleOpenInNewTab = (imageUrl: string) => {
  //   window.open(imageUrl, '_blank');
  // };

  const handleOpenInNewTab = (imageUrl: string) => {

    try {
      // If it's already http(s) or a blob URL, just open it.
      if (!imageUrl.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
        return;
      }
  
      // data:[mime];base64,<payload>
      const [meta, base64] = imageUrl.split(",");
      const mime = meta.split(":")[1]?.split(";")[0] || "image/png";
  
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
  
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
  
      // Cleanup after the new tab has loaded it
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error("Failed to open image in new tab:", err);
    }
  };
  


  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {images.map((image) => (
          <div
            key={image.id}
            className={cn(
              "relative bg-card rounded-apple overflow-hidden shadow-apple transition-spring border-2 group",
              image.selected ? "border-primary" : "border-transparent"
            )}
          >
            {/* Selection Overlay */}
            <button
              onClick={() => onImageSelect(image.id)}
              className="absolute top-3 left-3 z-10"
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-spring",
                  image.selected
                    ? "bg-primary border-primary"
                    : "bg-background/80 border-border backdrop-blur-sm"
                )}
              >
                {image.selected && <Check className="h-4 w-4 text-primary-foreground" />}
              </div>
            </button>

            {/* Action Buttons */}
            <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 lg:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={() => toggleFavorite(image.id)}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    favorites.has(image.id)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={() => handleOpenInNewTab(image.url)}
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            {/* Image */}
            <div className="aspect-square bg-muted flex items-center justify-center">
              {/* In a real app, this would be: */}
              <img src={image.url} alt={image.prompt} className="w-full h-full object-cover" />
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;