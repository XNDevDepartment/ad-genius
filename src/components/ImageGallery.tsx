import { useState } from "react";
import { Check, Star, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (imageId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(imageId)) {
      newFavorites.delete(imageId);
    } else {
      newFavorites.add(imageId);
    }
    setFavorites(newFavorites);
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
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
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