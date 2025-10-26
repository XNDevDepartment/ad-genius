import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, X } from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
  onDownload?: () => void;
  onOpenInNewTab?: () => void;
}

export const ImagePreviewModal = ({
  isOpen,
  onClose,
  imageUrl,
  imageName = "Image",
  onDownload,
  onOpenInNewTab,
}: ImagePreviewModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>{imageName}</DialogTitle>
            <div className="flex items-center gap-2">
              {onOpenInNewTab && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenInNewTab}
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
              {onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDownload}
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="relative overflow-auto p-4">
          <img
            src={imageUrl}
            alt={imageName}
            className="w-full h-auto object-contain rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
