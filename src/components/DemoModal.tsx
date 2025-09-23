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

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={"max-w-full w-[95vw] h-[90vh] p-0 overflow-hidden"}
      >
        <DialogHeader className={'p-6 pb-0 flex flex-row items-center justify-between'}>
          <DialogTitle className="text-2xl font-bold">
            Interactive Demo
          </DialogTitle>
        </DialogHeader>
        <div>
          <div className="h-full rounded-lg overflow-hidden">
            <ArcadeEmbed/>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}