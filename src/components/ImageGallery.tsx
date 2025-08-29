import { Check, Star, ExternalLink, Image } from "lucide-react";
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
  images: GeneratedImage[];          // images we already have (0..n)
  totalSlots: number;                // how many images user requested
  isGenerating?: boolean;            // show animated state for placeholders
  onImageSelect: (imageId: string) => void;
}

function PlaceholderCell({ isGenerating }: { isGenerating?: boolean }) {
  // EXACT same sizing as image cell via aspect-square
  return (
    <>
    <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/60 animate-pulse">
      <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px'
          }}>
      </div>
    </div>

    <div className="absolute inset-0 gen-glow flex items-center justify-center">
      <div className="text-center relative z-10">
        <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse text-white" />
        <p className="text-xs text-muted-foreground text-white">
          Generating...
        </p>
      </div>
    </div>
    </>
  );
}

const ImageGallery = ({ images, totalSlots, isGenerating = false, onImageSelect }: ImageGalleryProps) => {
  const { favorites, toggleFavorite } = useFavorites();

  // render one square per requested image; if we already have more images, show them all
  const slots = Math.max(totalSlots, images.length);

  // safe accessor
  const imgAt = (i: number) => images[i];

  const handleOpenInNewTab = (imageUrl: string) => {
    try {
      if (!imageUrl.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
        return;
      }
      const [meta, base64] = imageUrl.split(",");
      const mime = meta.split(":")[1]?.split(";")[0] || "image/png";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error("Failed to open image in new tab:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 mb-5 lg:grid-cols-3 xl:grid-cols-3">
      {/* <div className={cn("grid gap-4 mb-5 lg:grid-cols-3 xl:grid-cols-6", images.length === 1 && "grid-cols-1", images.length === 2 && "grid-cols-2", images.length === 3 && "grid-cols-3" )}> */}
        {Array.from({ length: slots }).map((_, i) => {
          const image = imgAt(i);
          const selected = !!image?.selected;

          return (
            <div
              key={image?.id ?? `slot-${i}`}
              className={cn(
                "relative bg-card rounded-apple overflow-hidden shadow-apple transition-spring  group",
                selected ? "border-primary" : "border-transparent"
              )}
            >
              {/* Selection Overlay — only if there is an image */}
              {image && (
                <button
                  onClick={() => onImageSelect(image.id)}
                  className="absolute top-3 left-3 z-10"
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-spring",
                      selected
                        ? "bg-primary border-primary"
                        : "bg-background/80 border-border backdrop-blur-sm"
                    )}
                  >
                    {selected && <Check className="h-4 w-4 text-primary-foreground" />}
                  </div>
                </button>
              )}

              {/* Action Buttons — only when there is an image */}
              {image && (
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
              )}

              {/* Body — same aspect-square box in both cases */}
              <div className="aspect-square bg-muted flex items-center justify-center">
                {image ? (
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <PlaceholderCell isGenerating={isGenerating} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImageGallery;
