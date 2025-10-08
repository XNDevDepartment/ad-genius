import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Image as ImageIcon } from 'lucide-react';
import { useUgcImages, type UgcImage } from '@/hooks/useUgcImages';

interface SourceImagePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (image: UgcImage) => void;
}

export const SourceImagePicker = ({ open, onClose, onSelect }: SourceImagePickerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { ugcImages, loading } = useUgcImages();

  const filteredImages = ugcImages.filter(image =>
    image.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (image: UgcImage) => {
    onSelect(image);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose from Your Generated Images</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* Images Grid */}
          <ScrollArea className="h-96">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-2">
                {filteredImages.map((image) => (
                  <div key={image.id} className="group cursor-pointer" onClick={() => handleSelect(image)}>
                    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent group-hover:border-primary transition-colors">
                      <img
                        src={image.signedUrl}
                        alt={image.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                      {image.fileName}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center mb-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">
                  {searchTerm ? 'No images match your search' : 'No generated images found'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'Try a different search term' : 'Generate some UGC images first'}
                </p>
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};