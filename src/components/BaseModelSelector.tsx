import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBaseModels, BaseModel, BaseModelFilters } from "@/hooks/useBaseModels";
import { Upload, Check, User, Sparkles, Coins, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";
// useCredits import removed - model creation now open to all users
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { UploadModelDialog } from "./UploadModelDialog";
import { AIModelGenerationForm } from "./AIModelGenerationForm";
import { ModelPreviewDialog } from "./ModelPreviewDialog";
import { useToast } from "@/hooks/use-toast";
import { baseModelApi } from "@/api/base-model-api";

interface BaseModelSelectorProps {
  selectedModel: BaseModel | null;
  onSelectModel: (model: BaseModel) => void;
  showUpload?: boolean;
}

export const BaseModelSelector = ({
  selectedModel,
  onSelectModel,
  showUpload = false,
}: BaseModelSelectorProps) => {
  const { systemModels, userModels, loading, fetchSystemModels, uploadUserModel, uploading, fetchUserModels } = useBaseModels();
  // Credits hook no longer needed for tier check - feature open to all
  const { t } = useTranslation();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadDialogAIOpen, setUploadDialogAIOpen] = useState(false);
  const [filters, setFilters] = useState<BaseModelFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredModels = systemModels.filter((model) => {
    if (searchTerm && !model.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleFilterChange = (key: keyof BaseModelFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    fetchSystemModels(newFilters);
  };

  const handleUploadClick = () => {
    setUploadDialogOpen(true);
  };

  const handleUploadAIClick = () => {
    setUploadDialogAIOpen(true);
  };

  const handleUpload = async (file: File, metadata: any) => {
    setIsProcessing(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const imageDataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Process and get preview
      const previewResult = await baseModelApi.uploadAndProcessModel(
        imageDataUrl,
        metadata,
        true
      );

      // Show preview dialog
      setPreviewData({
        imageUrl: previewResult.imageDataUrl,
        metadata: {
          name: metadata.name,
          gender: metadata.gender,
          age_range: metadata.ageRange,
          body_type: metadata.bodyType,
          skin_tone: metadata.skinTone,
          pose_type: metadata.poseType,
        },
        creditsDeducted: 3,
        isAIGenerated: false,
      });
      setPreviewDialogOpen(true);
      setUploadDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('outfitSwap.errors.failedToStart'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAIModel = async (params: any) => {
    setIsProcessing(true);
    try {
      // Generate and get preview
      const previewResult = await baseModelApi.generateModelWithAI(params, true);

      // Show preview dialog
      setPreviewData({
        imageUrl: previewResult.imageDataUrl,
        metadata: {
          name: params.name,
          gender: params.gender,
          nationality: params.nationality,
          age_range: params.ageRange,
          body_type: params.bodyType,
          skin_tone: params.skinTone,
          pose_type: params.pose,
        },
        creditsDeducted: 6,
        isAIGenerated: true,
      });
      setPreviewDialogOpen(true);
      setUploadDialogAIOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate AI model");
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPreview = async () => {
    if (!previewData) return;

    setIsSaving(true);
    try {
      // Save the model
      const savedModel = await baseModelApi.saveModelFromPreview(
        previewData.imageUrl,
        previewData.metadata,
        previewData.isAIGenerated
      );

      toast.success(`Your model "${previewData.metadata.name}" has been saved successfully`);

      // Refresh user models
      await fetchUserModels();

      // Auto-select the newly created model
      onSelectModel(savedModel);

      // Close preview dialog
      setPreviewDialogOpen(false);
      setPreviewData(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save model");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewDialogOpen(false);
    setPreviewData(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* <div className="space-y-2">
          <Label className="text-sm">{t('outfitSwap.baseModelSelector.filters.gender')}</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.gender || ""}
            onChange={(e) => handleFilterChange("gender", e.target.value)}
          >
            <option value="">{t('outfitSwap.baseModelSelector.filters.all')}</option>
            <option value="male">{t('outfitSwap.baseModelSelector.genderOptions.male')}</option>
            <option value="female">{t('outfitSwap.baseModelSelector.genderOptions.female')}</option>
            <option value="unisex">{t('outfitSwap.baseModelSelector.genderOptions.unisex')}</option>
          </select>
        </div> */}

        {/* <div className="space-y-2">
          <Label className="text-sm">{t('outfitSwap.baseModelSelector.filters.ageRange')}</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.ageRange || ""}
            onChange={(e) => handleFilterChange("ageRange", e.target.value)}
          >
            <option value="">{t('outfitSwap.baseModelSelector.filters.all')}</option>
            <option value="0-12 months">{t('outfitSwap.baseModelSelector.ageRanges.0-12months')}</option>
            <option value="1-3 years">{t('outfitSwap.baseModelSelector.ageRanges.1-3years')}</option>
            <option value="4-7 years">{t('outfitSwap.baseModelSelector.ageRanges.4-7years')}</option>
            <option value="8-12 years">{t('outfitSwap.baseModelSelector.ageRanges.8-12years')}</option>
            <option value="13-17 years">{t('outfitSwap.baseModelSelector.ageRanges.13-17years')}</option>
            <option value="18-22 years">{t('outfitSwap.baseModelSelector.ageRanges.18-22years')}</option>
            <option value="23-35 years">{t('outfitSwap.baseModelSelector.ageRanges.23-35years')}</option>
            <option value="36-50 years">{t('outfitSwap.baseModelSelector.ageRanges.36-50years')}</option>
            <option value="51-65 years">{t('outfitSwap.baseModelSelector.ageRanges.51-65years')}</option>
            <option value="65+ years">{t('outfitSwap.baseModelSelector.ageRanges.65plus')}</option>
          </select>
        </div> */}

        {/* <div className="space-y-2">
          <Label className="text-sm">{t('outfitSwap.baseModelSelector.filters.bodyType')}</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.bodyType || ""}
            onChange={(e) => handleFilterChange("bodyType", e.target.value)}
          >
            <option value="">{t('outfitSwap.baseModelSelector.filters.all')}</option>
            <option value="slim">{t('outfitSwap.baseModelSelector.bodyTypes.slim')}</option>
            <option value="athletic">{t('outfitSwap.baseModelSelector.bodyTypes.athletic')}</option>
            <option value="average">{t('outfitSwap.baseModelSelector.bodyTypes.average')}</option>
            <option value="plus">{t('outfitSwap.baseModelSelector.bodyTypes.plus')}</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">{t('outfitSwap.baseModelSelector.filters.pose')}</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.poseType || ""}
            onChange={(e) => handleFilterChange("poseType", e.target.value)}
          >
            <option value="">{t('outfitSwap.baseModelSelector.filters.all')}</option>
            <option value="front">{t('outfitSwap.baseModelSelector.poses.front')}</option>
            <option value="side">{t('outfitSwap.baseModelSelector.poses.side')}</option>
            <option value="back">{t('outfitSwap.baseModelSelector.poses.back')}</option>
            <option value="angled">{t('outfitSwap.baseModelSelector.poses.angled')}</option>
          </select>
        </div> */}

        {/* <div className="space-y-2">
          <Label className="text-sm">{t('outfitSwap.baseModelSelector.filters.skinTone')}</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.skinTone || ""}
            onChange={(e) => handleFilterChange("skinTone", e.target.value)}
          >
            <option value="">{t('outfitSwap.baseModelSelector.filters.all')}</option>
            <option value="light">{t('outfitSwap.baseModelSelector.skinTones.light')}</option>
            <option value="medium">{t('outfitSwap.baseModelSelector.skinTones.medium')}</option>
            <option value="tan">{t('outfitSwap.baseModelSelector.skinTones.tan')}</option>
            <option value="dark">{t('outfitSwap.baseModelSelector.skinTones.dark')}</option>
          </select>
        </div> */}
      </div>

      {/* Search */}
      {/* <Input
        placeholder={t('outfitSwap.baseModelSelector.search')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      /> */}

      {/* Model Grid */}
      <ScrollArea className="h-[500px] w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">

          {/* Upload Card (Premium) */}
          {showUpload && (
            <Card
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg border-dashed",
                uploading && "opacity-50 pointer-events-none"
              )}
            >
              <div className="aspect-[3/4] flex items-center justify-center flex-col gap-2 p-4 text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {uploading ? t('outfitSwap.baseModelSelector.upload.titleUploading') : t('outfitSwap.baseModelSelector.upload.title')}
                  </h3>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Coins className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {t('outfitSwap.baseModelSelector.upload.uploadCost', '5 credits')}
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <Button size="sm" variant="outline" onClick={handleUploadClick}>
                    {t('outfitSwap.baseModelSelector.upload.uploadOwn')}
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">{t('common.or', 'or')}</span>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <WandSparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {t('outfitSwap.baseModelSelector.upload.aiGenerate', 'Generate with AI')}
                  </h3>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Coins className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {t('outfitSwap.baseModelSelector.upload.aiGenerateCost', '6 credits')}
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <Button size="sm" variant="outline" onClick={handleUploadAIClick}>
                    {t('outfitSwap.baseModelSelector.upload.createWithAI')}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* User Models */}
          {userModels.map((model) => (
            <Card
              key={model.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                selectedModel?.id === model.id && "ring-2 ring-primary"
              )}
              onClick={() => onSelectModel(model)}
            >
              <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
                <img
                  src={model.thumbnail_url || model.public_url}
                  alt={model.name}
                  className="w-full h-full object-cover object-top"
                />
                {selectedModel?.id === model.id && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2" variant="default">
                  <User className="w-3 h-3 mr-1" />
                  {t('outfitSwap.baseModelSelector.badges.yourModel')}
                </Badge>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate">{model.name}</h3>
                <div className="flex flex-wrap gap-1 mt-2">
                  {model.gender && (
                    <Badge variant="outline" className="text-xs">
                      {model.gender}
                    </Badge>
                  )}
                  {model.age_range && (
                    <Badge variant="outline" className="text-xs">
                      {model.age_range}
                    </Badge>
                  )}
                  {model.body_type && (
                    <Badge variant="outline" className="text-xs">
                      {model.body_type}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}


          {/* System Models */}
          {filteredModels.map((model) => (
            <Card
              key={model.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                selectedModel?.id === model.id && "ring-2 ring-primary"
              )}
              onClick={() => onSelectModel(model)}
            >
              <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
                <img
                  src={model.thumbnail_url || model.public_url}
                  alt={model.name}
                  className="w-full h-full object-cover"
                />
                {selectedModel?.id === model.id && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate">{model.name}</h3>
                <div className="flex flex-wrap gap-1 mt-2">
                  {model.gender && (
                    <Badge variant="outline" className="text-xs">
                      {model.gender}
                    </Badge>
                  )}
                  {model.age_range && (
                    <Badge variant="outline" className="text-xs">
                      {model.age_range}
                    </Badge>
                  )}
                  {model.body_type && (
                    <Badge variant="outline" className="text-xs">
                      {model.body_type}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            {t('outfitSwap.baseModelSelector.loading')}
          </div>
        )}

        {!loading && filteredModels.length === 0 && userModels.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('outfitSwap.baseModelSelector.noModels')}
          </div>
        )}
      </ScrollArea>

      {/* Upload Dialog */}
      <UploadModelDialog
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onUpload={handleUpload}
        uploading={isProcessing}
      />

      <AIModelGenerationForm 
        isOpen={uploadDialogAIOpen} 
        onClose={() => setUploadDialogAIOpen(false)} 
        onGenerate={handleGenerateAIModel} 
        isGenerating={isProcessing} 
      />

      {/* Preview Dialog */}
      {previewData && (
        <ModelPreviewDialog
          isOpen={previewDialogOpen}
          onClose={handleClosePreview}
          onConfirm={handleConfirmPreview}
          imageUrl={previewData.imageUrl}
          metadata={previewData.metadata}
          creditsDeducted={previewData.creditsDeducted}
          isGeneratedWithAI={previewData.isAIGenerated}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};
