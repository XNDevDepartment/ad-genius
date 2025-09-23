import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, X } from "lucide-react";
import { ArcadeEmbed } from "./ArcadeEmbed";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleClose = () => {
    setIsFullscreen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={
          isFullscreen 
            ? "fixed inset-0 w-screen h-screen max-w-none p-0 overflow-hidden border-0 rounded-none"
            : "max-w-6xl w-[95vw] h-[80vh] p-0 overflow-hidden"
        }
      >
        <DialogHeader className={`${isFullscreen ? 'p-4 pb-0' : 'p-6 pb-0'} flex flex-row items-center justify-between`}>
          <DialogTitle className="text-2xl font-bold">
            ProductPix Interactive Demo
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className={`${isFullscreen ? 'p-4 pt-0' : 'px-6 pb-6'} h-full`}>
          <div className="h-full rounded-lg overflow-hidden">
            <ArcadeEmbed isFullscreen={isFullscreen} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}