import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ImageIcon, Loader2 } from "lucide-react";
import { useSourceImages, SourceImage } from "@/hooks/useSourceImages";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface GarmentLibraryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (images: SourceImage[]) => void;
  maxImages?: number;
  currentCount?: number;
}

export const GarmentLibraryPicker = ({
  open,
  onClose,
  onSelect,
  maxImages = 10,
  currentCount = 0,
}: GarmentLibraryPickerProps) => {
  const { t } = useTranslation();
  const { sourceImages, loading } = useSourceImages();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const remainingSlots = maxImages - currentCount;

  const filteredImages = useMemo(() => {
    if (!searchTerm.trim()) return sourceImages;
    const term = searchTerm.toLowerCase();
    return sourceImages.filter(
      (img) =>
        img.fileName?.toLowerCase().includes(term) ||
        img.id.toLowerCase().includes(term)
    );
  }, [sourceImages, searchTerm]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < remainingSlots) {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedImages = sourceImages.filter((img) => selectedIds.has(img.id));
    onSelect(selectedImages);
    setSelectedIds(new Set());
    setSearchTerm("");
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchTerm("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            {t('outfitSwap.garmentUploader.selectFromLibrary', 'Select from Library')}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('outfitSwap.garmentUploader.searchPlaceholder', 'Search images...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selection counter */}
        <div className="text-sm text-muted-foreground">
          {t('outfitSwap.garmentUploader.selectedCount', '{{count}} of {{max}} selected', {
            count: selectedIds.size,
            max: remainingSlots,
          })}
        </div>

        {/* Image Grid */}
        <ScrollArea className="flex-1 min-h-[300px] max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
              <p>{t('outfitSwap.garmentUploader.noImagesFound', 'No images found')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-1">
              {filteredImages.map((image) => {
                const isSelected = selectedIds.has(image.id);
                const isDisabled = !isSelected && selectedIds.size >= remainingSlots;

                return (
                  <div
                    key={image.id}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-primary/50",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !isDisabled && toggleSelection(image.id)}
                  >
                    <img
                      src={image.signedUrl}
                      alt={image.fileName || "Source image"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        className="bg-background/80 backdrop-blur-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            {t('outfitSwap.garmentUploader.addSelected', 'Add {{count}} Selected', {
              count: selectedIds.size,
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
