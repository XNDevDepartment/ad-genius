import { useState, useCallback } from "react";
import { Upload, X, Sparkles, Shirt, Footprints, Watch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSourceImageUpload } from "@/hooks/useSourceImageUpload";
import { outfitCreatorApi, GarmentAnalysis } from "@/api/outfit-creator-api";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type SlotType = 'top' | 'bottom' | 'shoes' | 'accessory_1' | 'accessory_2';

export interface GarmentSlotData {
  file?: File;
  preview?: string;
  sourceImageId?: string;
  analysis?: GarmentAnalysis;
  analyzing?: boolean;
}

interface OutfitCreatorSlotsProps {
  slots: Record<SlotType, GarmentSlotData | undefined>;
  onSlotsChange: (slots: Record<SlotType, GarmentSlotData | undefined>) => void;
  disabled?: boolean;
}

const SLOT_CONFIG: Record<SlotType, { label: string; icon: React.ElementType; required?: boolean }> = {
  top: { label: 'outfitCreator.slots.top', icon: Shirt, required: true },
  bottom: { label: 'outfitCreator.slots.bottom', icon: Shirt, required: true },
  shoes: { label: 'outfitCreator.slots.shoes', icon: Footprints },
  accessory_1: { label: 'outfitCreator.slots.accessory1', icon: Watch },
  accessory_2: { label: 'outfitCreator.slots.accessory2', icon: Watch },
};

export function OutfitCreatorSlots({ slots, onSlotsChange, disabled }: OutfitCreatorSlotsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { uploadSourceImage } = useSourceImageUpload();
  const [uploadingSlot, setUploadingSlot] = useState<SlotType | null>(null);

  const handleFileSelect = useCallback(async (slotType: SlotType, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: t('outfitCreator.errors.invalidFile'),
        description: t('outfitCreator.errors.imageOnly'),
      });
      return;
    }

    setUploadingSlot(slotType);
    const preview = URL.createObjectURL(file);

    // Set preview immediately
    onSlotsChange({
      ...slots,
      [slotType]: { file, preview, analyzing: true },
    });

    try {
      // Upload to source images
      const uploaded = await uploadSourceImage(file);
      
      // Analyze garment
      let analysis: GarmentAnalysis | undefined;
      try {
        const result = await outfitCreatorApi.analyzeGarment(uploaded.id);
        analysis = result.analysis || undefined;
        
        // Check if suggested slot differs and notify
        if (analysis && result.suggestedSlot !== slotType.replace('_1', '').replace('_2', '')) {
          toast({
            title: t('outfitCreator.slotSuggestion'),
            description: t('outfitCreator.slotSuggestionDesc', { 
              detected: t(`outfitCreator.slots.${result.suggestedSlot}`),
              selected: t(SLOT_CONFIG[slotType].label)
            }),
          });
        }
      } catch (analyzeErr) {
        console.warn('[OutfitCreatorSlots] Analysis failed:', analyzeErr);
      }

      onSlotsChange({
        ...slots,
        [slotType]: { 
          file, 
          preview, 
          sourceImageId: uploaded.id, 
          analysis,
          analyzing: false 
        },
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t('outfitCreator.errors.uploadFailed'),
        description: err.message,
      });
      // Remove the slot on failure
      const newSlots = { ...slots };
      delete newSlots[slotType];
      onSlotsChange(newSlots);
    } finally {
      setUploadingSlot(null);
    }
  }, [slots, onSlotsChange, uploadSourceImage, toast, t]);

  const handleRemoveSlot = useCallback((slotType: SlotType) => {
    const newSlots = { ...slots };
    if (newSlots[slotType]?.preview) {
      URL.revokeObjectURL(newSlots[slotType]!.preview!);
    }
    delete newSlots[slotType];
    onSlotsChange(newSlots);
  }, [slots, onSlotsChange]);

  const handleDrop = useCallback((slotType: SlotType, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(slotType, file);
  }, [handleFileSelect]);

  const filledCount = Object.values(slots).filter(s => s?.sourceImageId).length;
  const hasRequiredSlots = slots.top?.sourceImageId || slots.bottom?.sourceImageId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('outfitCreator.slotsTitle')}</h3>
        <Badge variant={hasRequiredSlots ? "default" : "secondary"}>
          {filledCount}/5 {t('outfitCreator.garments')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main clothing column */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-medium">{t('outfitCreator.mainClothing')}</p>
          {(['top', 'bottom', 'shoes'] as SlotType[]).map((slotType) => (
            <SlotCard
              key={slotType}
              slotType={slotType}
              config={SLOT_CONFIG[slotType]}
              data={slots[slotType]}
              disabled={disabled || uploadingSlot !== null}
              uploading={uploadingSlot === slotType}
              onFileSelect={(file) => handleFileSelect(slotType, file)}
              onRemove={() => handleRemoveSlot(slotType)}
              onDrop={(e) => handleDrop(slotType, e)}
              t={t}
            />
          ))}
        </div>

        {/* Accessories column */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-medium">{t('outfitCreator.accessories')}</p>
          {(['accessory_1', 'accessory_2'] as SlotType[]).map((slotType) => (
            <SlotCard
              key={slotType}
              slotType={slotType}
              config={SLOT_CONFIG[slotType]}
              data={slots[slotType]}
              disabled={disabled || uploadingSlot !== null}
              uploading={uploadingSlot === slotType}
              onFileSelect={(file) => handleFileSelect(slotType, file)}
              onRemove={() => handleRemoveSlot(slotType)}
              onDrop={(e) => handleDrop(slotType, e)}
              t={t}
            />
          ))}
          
          {/* Info card */}
          <Card className="p-4 bg-muted/50 border-dashed">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">{t('outfitCreator.tip')}</p>
                <p className="text-muted-foreground">{t('outfitCreator.tipDescription')}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {!hasRequiredSlots && (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          {t('outfitCreator.requiredSlots')}
        </p>
      )}
    </div>
  );
}

interface SlotCardProps {
  slotType: SlotType;
  config: { label: string; icon: React.ElementType; required?: boolean };
  data?: GarmentSlotData;
  disabled?: boolean;
  uploading?: boolean;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  onDrop: (e: React.DragEvent) => void;
  t: (key: string) => string;
}

function SlotCard({ slotType, config, data, disabled, uploading, onFileSelect, onRemove, onDrop, t }: SlotCardProps) {
  const Icon = config.icon;
  const hasImage = !!data?.preview;
  const isAnalyzing = data?.analyzing;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        hasImage ? "p-0" : "p-4",
        !disabled && !hasImage && "hover:border-primary/50 cursor-pointer"
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={disabled ? undefined : onDrop}
    >
      {hasImage ? (
        <div className="relative aspect-square">
          <img
            src={data.preview}
            alt={t(config.label)}
            className="w-full h-full object-cover"
          />
          {/* Overlay with info */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium text-sm">{t(config.label)}</p>
                {data.analysis && (
                  <p className="text-white/70 text-xs">{data.analysis.type} • {data.analysis.color}</p>
                )}
                {isAnalyzing && (
                  <p className="text-white/70 text-xs animate-pulse">{t('outfitCreator.analyzing')}</p>
                )}
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={onRemove}
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <label className={cn(
          "flex flex-col items-center justify-center gap-2 min-h-[100px] cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed"
        )}>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled}
          />
          
          {uploading ? (
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          
          <div className="text-center">
            <p className="font-medium text-sm">{t(config.label)}</p>
            <p className="text-xs text-muted-foreground">
              {uploading ? t('outfitCreator.uploading') : t('outfitCreator.clickToUpload')}
            </p>
          </div>
          
          {config.required && (
            <Badge variant="outline" className="text-xs">
              {t('outfitCreator.recommended')}
            </Badge>
          )}
        </label>
      )}
    </Card>
  );
}
