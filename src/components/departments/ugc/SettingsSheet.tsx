import React, { useState } from "react";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SettingsForm, GenerationSettings } from "./SettingsForm";
import { useTranslation } from "react-i18next";

interface SettingsSheetProps {
  settings: GenerationSettings;
  onSettingsChange: (settings: Partial<GenerationSettings>) => void;
  remainingCredits: number;
  totalCredits: number;
  calculateImageCost: (quality: 'low' | 'medium' | 'high', count: number) => number;
  canGenerate: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export const SettingsSheet = ({ 
  settings, 
  onSettingsChange, 
  remainingCredits, 
  totalCredits,
  calculateImageCost,
  canGenerate,
  onGenerate,
  isGenerating,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false
}: SettingsSheetProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  


  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={true}>
      {!hideTrigger && (
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-card shadow-sm border-border/50"
          >
            <Settings className="h-4 w-4 mr-2" />
            Definições
          </Button>
        </SheetTrigger>
      )}

      <SheetContent side="bottom" className="h-[80vh] overflow-hidden">
        <div className="flex flex-col h-full">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>{t('ugc.generationSettings.title')}</SheetTitle>
          </SheetHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <SettingsForm
                settings={settings}
                onSettingsChange={onSettingsChange}
                remainingCredits={remainingCredits}
                totalCredits={totalCredits}
                calculateImageCost={calculateImageCost}
                compact
              />

          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};