import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBaseModels, BaseModel, BaseModelFilters } from "@/hooks/useBaseModels";
import { Upload, Check, User, Sparkles, Crown, AirVentIcon, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "sonner";
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
  const { toast } = useToast();
  const { systemModels, userModels, loading, fetchSystemModels, uploadUserModel, uploading, fetchUserModels } = useBaseModels();
  const { isFreeTier } = useCredits();
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
    if (isFreeTier()) {
      // toast.error('Premium subscription required to upload custom base models');
      return;
    }
    setUploadDialogOpen(true);
  };

  const handleUploadAIClick = () => {
    if (isFreeTier()) {
      // toast.error('Premium subscription required to upload custom base models');
      return;
    }
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
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process image",
      });
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
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate AI model",
      });
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

      toast({
        title: "Model saved",
        description: `Your model "${previewData.metadata.name}" has been saved successfully`,
      });

      // Refresh user models
      await fetchUserModels();

      // Auto-select the newly created model
      onSelectModel(savedModel);

      // Close preview dialog
      setPreviewDialogOpen(false);
      setPreviewData(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save model",
      });
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
        <div className="space-y-2">
          <Label className="text-sm">Gender</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.gender || ""}
            onChange={(e) => handleFilterChange("gender", e.target.value)}
          >
            <option value="">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="unisex">Unisex</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Age Range</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.ageRange || ""}
            onChange={(e) => handleFilterChange("ageRange", e.target.value)}
          >
            <option value="">All</option>
            <option value="0-12 months">0-12 months</option>
            <option value="1-3 years">1-3 years</option>
            <option value="4-7 years">4-7 years</option>
            <option value="8-12 years">8-12 years</option>
            <option value="13-17 years">13-17 years</option>
            <option value="18-22 years">18-22 years</option>
            <option value="23-35 years">23-35 years</option>
            <option value="36-50 years">36-50 years</option>
            <option value="51-65 years">51-65 years</option>
            <option value="65+ years">65+ years</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Body Type</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.bodyType || ""}
            onChange={(e) => handleFilterChange("bodyType", e.target.value)}
          >
            <option value="">All</option>
            <option value="slim">Slim</option>
            <option value="athletic">Athletic</option>
            <option value="average">Average</option>
            <option value="plus">Plus</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Pose</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.poseType || ""}
            onChange={(e) => handleFilterChange("poseType", e.target.value)}
          >
            <option value="">All</option>
            <option value="front">Front</option>
            <option value="side">Side</option>
            <option value="back">Back</option>
            <option value="angled">Angled</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Skin Tone</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.skinTone || ""}
            onChange={(e) => handleFilterChange("skinTone", e.target.value)}
          >
            <option value="">All</option>
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="tan">Tan</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search models by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {/* Model Grid */}
      <ScrollArea className="h-[500px] w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
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
                <Badge className="absolute top-2 left-2" variant="secondary">
                  <Sparkles className="w-3 h-3 mr-1" />
                  System
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
                  className="w-full h-full object-cover"
                />
                {selectedModel?.id === model.id && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2" variant="default">
                  <User className="w-3 h-3 mr-1" />
                  Your Model
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

          {/* Upload Card (Premium) */}
          {showUpload && (
            <Card
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg border-dashed",
                uploading && "opacity-50 pointer-events-none"
              )}
            >
              <div className="aspect-[3/4] flex items-center justify-center flex-col gap-3 p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {uploading ? 'Uploading...' : 'Upload Your Model'}
                  </h3>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Crown className="w-3 h-3 text-primary" />
                    <p className="text-xs text-muted-foreground">
                      Premium feature
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <Button size="sm" variant="outline" onClick={handleUploadClick}>
                    Upload Your Own
                  </Button>
                )}
                or
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <WandSparkles className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {uploading ? 'Uploading...' : 'Upload Your Model'}
                  </h3>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Crown className="w-3 h-3 text-primary" />
                    <p className="text-xs text-muted-foreground">
                      Premium feature
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <Button size="sm" variant="outline" onClick={handleUploadAIClick}>
                    Create with AI
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading models...
          </div>
        )}

        {!loading && filteredModels.length === 0 && userModels.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No models found
          </div>
        )}
      </ScrollArea>

      {/* Upload Dialog */}
      <UploadModelDialog
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onUpload={handleUpload}
        uploading={uploading}
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
