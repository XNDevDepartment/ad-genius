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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={"max-w-full w-[95vw] h-[90vh] p-0 overflow-hidden"}
      >
        <DialogHeader className={'p-6 pb-2 flex flex-col items-start justify-start'}>
          <div className={isFullscreen ? 'flex flex-col' : ''}>
            <DialogTitle className="text-2xl font-bold">
              Interactive Demo
            </DialogTitle>
              <p className="text-muted-foreground mt-2">
                Click on "Get Started" to initiate the guided demo.
              </p>
          </div>
        </DialogHeader>
        <div>
          <div className="h-full rounded-lg overflow-hidden">
            {isMobile ? (
              <ArcadeEmbedMobile />
            ) : (
              <ArcadeEmbed />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}