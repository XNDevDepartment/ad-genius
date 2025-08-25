import React from "react";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import OrientationSelector from "@/components/OrientationSelector";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

export interface GenerationSettings {
  numImages: number;
  style: string;
  timeOfDay: string;
  highlight: string;
  imageOrientation: string;
  imageQuality: 'low' | 'medium' | 'high';
}

interface SettingsFormProps {
  settings: GenerationSettings;
  onSettingsChange: (settings: Partial<GenerationSettings>) => void;
  remainingCredits: number;
  calculateImageCost: (quality: 'low' | 'medium' | 'high', count: number) => number;
  compact?: boolean;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function labelTime(v: "natural" | "golden" | "night") {
  return v === "natural" ? "Natural" : v === "golden" ? "Golden" : "Night";
}

export const SettingsForm = ({ 
  settings, 
  onSettingsChange, 
  remainingCredits, 
  calculateImageCost,
  compact = false 
}: SettingsFormProps) => {
  const { t } = useTranslation();
  
  const totalCredits = {
    'Free': 60,
    'Pro': 500,
    'Enterprise': 2000
  }['Free']; // Default to Free for now
  
  const usedCredits = totalCredits - remainingCredits;
  const usagePercentage = (usedCredits / totalCredits) * 100;
  const creditsNeeded = calculateImageCost(settings.imageQuality, settings.numImages);

  return (
    <div className="space-y-4">
      {/* Credits Overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Créditos</span>
          <span>{remainingCredits} de {totalCredits}</span>
        </div>
        <Progress value={usagePercentage} className="h-2" />
        <div className="text-xs text-muted-foreground text-center">
          Esta geração: {creditsNeeded} crédito{creditsNeeded !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Number of Images */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Número de Imagens</Label>
        <ToggleGroup 
          type="single" 
          value={settings.numImages.toString()} 
          onValueChange={(value) => value && onSettingsChange({ numImages: parseInt(value) })}
          className="justify-start"
        >
          <ToggleGroupItem value="1" className="flex-1">1</ToggleGroupItem>
          <ToggleGroupItem value="2" className="flex-1">2</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Style */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Estilo</Label>
        <ToggleGroup 
          type="single" 
          value={settings.style} 
          onValueChange={(value) => value && onSettingsChange({ style: value })}
          className="justify-start grid grid-cols-3 gap-1"
        >
          {(["lifestyle", "studio", "editorial"] as const).map((s) => (
            <ToggleGroupItem key={s} value={s} className="text-xs px-2 py-1">
              {capitalize(s)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Time of Day */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Hora do Dia</Label>
        <ToggleGroup 
          type="single" 
          value={settings.timeOfDay} 
          onValueChange={(value) => value && onSettingsChange({ timeOfDay: value })}
          className="justify-start grid grid-cols-3 gap-1"
        >
          <ToggleGroupItem value="natural" className="text-xs px-2 py-1">Natural</ToggleGroupItem>
          <ToggleGroupItem value="golden" className="text-xs px-2 py-1">Golden</ToggleGroupItem>
          <ToggleGroupItem value="night" className="text-xs px-2 py-1">Night</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Orientation */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Orientação</Label>
        <ToggleGroup 
          type="single" 
          value={settings.imageOrientation} 
          onValueChange={(value) => value && onSettingsChange({ imageOrientation: value })}
          className="justify-start grid grid-cols-3 gap-1"
        >
          {["1:1", "4:5", "16:9"].map((o) => (
            <ToggleGroupItem key={o} value={o} className="text-xs px-2 py-1">
              {o}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Image Quality */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Qualidade</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-3 w-3 p-0">
                  <HelpCircle className="h-2 w-2 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Higher quality uses more credits but produces better results</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <ToggleGroup 
          type="single" 
          value={settings.imageQuality} 
          onValueChange={(value) => value && onSettingsChange({ imageQuality: value as 'low' | 'medium' | 'high' })}
          className="justify-start grid grid-cols-3 gap-1"
        >
          <ToggleGroupItem value="low" className="text-xs px-2 py-1">
            Baixa
            <div className="text-[10px] opacity-70">1 crédito</div>
          </ToggleGroupItem>
          <ToggleGroupItem value="medium" className="text-xs px-2 py-1">
            Média
            <div className="text-[10px] opacity-70">1.5 créditos</div>
          </ToggleGroupItem>
          <ToggleGroupItem value="high" className="text-xs px-2 py-1">
            Alta
            <div className="text-[10px] opacity-70">2 créditos</div>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Highlight Product */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Destacar Produto</Label>
        <ToggleGroup 
          type="single" 
          value={settings.highlight} 
          onValueChange={(value) => value && onSettingsChange({ highlight: value })}
          className="justify-start"
        >
          <ToggleGroupItem value="yes" className="flex-1 text-xs">Sim</ToggleGroupItem>
          <ToggleGroupItem value="no" className="flex-1 text-xs">Não</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};