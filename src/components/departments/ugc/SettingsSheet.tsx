import React, { useState } from "react";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SettingsForm, GenerationSettings } from "./SettingsForm";

interface SettingsSheetProps {
  settings: GenerationSettings;
  onSettingsChange: (settings: Partial<GenerationSettings>) => void;
  remainingCredits: number;
  calculateImageCost: (quality: 'low' | 'medium' | 'high', count: number) => number;
  canGenerate: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group">
      <summary className="cursor-pointer list-none text-sm font-semibold select-none flex items-center justify-between py-2">
        {title}
        <span className="ml-2 text-xs text-muted-foreground group-open:hidden">(tocar para expandir)</span>
      </summary>
      <div className="mt-2 p-3 border rounded-2xl bg-card">
        {children}
      </div>
    </details>
  );
}

export const SettingsSheet = ({ 
  settings, 
  onSettingsChange, 
  remainingCredits, 
  calculateImageCost,
  canGenerate,
  onGenerate,
  isGenerating
}: SettingsSheetProps) => {
  const [open, setOpen] = useState(false);
  const credits = calculateImageCost(settings.imageQuality, settings.numImages);
  
  const summary = `${settings.numImages} imagem${settings.numImages > 1 ? 'ns' : ''} • ${settings.style} • ${settings.imageQuality} • ${settings.imageOrientation}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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

      <SheetContent side="bottom" className="h-[80vh] overflow-hidden">
        <div className="flex flex-col h-full">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>Definições de Geração</SheetTitle>
          </SheetHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <Section title="Básico">
              <SettingsForm
                settings={settings}
                onSettingsChange={onSettingsChange}
                remainingCredits={remainingCredits}
                calculateImageCost={calculateImageCost}
                compact
              />
            </Section>

            {/* Advanced (placeholder for future) */}
            <details className="group">
              <summary className="cursor-pointer list-none text-sm font-medium flex items-center justify-between py-2">
                Avançado
                <span className="text-xs text-muted-foreground">Opcional</span>
              </summary>
              <div className="mt-2 p-3 border rounded-xl text-sm text-muted-foreground bg-muted/20">
                Aqui podes adicionar parâmetros como "negative prompts", seed, segurança, etc.
              </div>
            </details>
          </div>

          {/* Fixed footer */}
          <div className="border-t bg-background p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Resumo</span>
              <span className="text-right">{summary}</span>
            </div>
            <Button 
              onClick={() => {
                setOpen(false);
                onGenerate();
              }} 
              className="w-full"
              disabled={!canGenerate || isGenerating}
            >
              {isGenerating ? "A gerar..." : `Usar estas definições (${credits} ${credits === 1 ? "crédito" : "créditos"})`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};