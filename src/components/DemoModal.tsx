import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArcadeEmbed } from "./ArcadeEmbed";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-center">
            ProductPix Interactive Demo
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 h-full">
          <div className="h-full rounded-lg overflow-hidden">
            <ArcadeEmbed />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}