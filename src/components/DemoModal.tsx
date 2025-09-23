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
import { ArcadeEmbedMobile } from "./ArcadeEmbedMobile";
import { useIsMobile } from "@/hooks/use-mobile";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = useIsMobile();

  const handleClose = () => {
    onClose();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={isFullscreen ? "fixed inset-0 z-50 w-screen h-screen p-0 overflow-hidden bg-background" : "max-w-full w-[95vw] h-[90vh] p-0 overflow-hidden"}
      >
        <DialogHeader className={isFullscreen ? 'p-4 pb-2 flex flex-row items-center justify-between bg-background/95 backdrop-blur-sm border-b' : 'p-6 pb-2 flex flex-col items-start justify-start'}>
          <div className={isFullscreen ? 'flex flex-col' : ''}>
            <DialogTitle className="text-2xl font-bold">
              Interactive Demo
            </DialogTitle>
            {!isFullscreen && (
              <p className="text-muted-foreground mt-2">
                Click on "Get Started" to initiate the guided demo.
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="ml-auto"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Button>
        </DialogHeader>
        <div className={isFullscreen ? "flex-1 overflow-hidden" : ""}>
          <div className="h-full rounded-lg overflow-hidden">
            {isMobile ? (
              <ArcadeEmbedMobile isFullscreen={isFullscreen} />
            ) : (
              <ArcadeEmbed isFullscreen={isFullscreen} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}