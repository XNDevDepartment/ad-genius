import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "@/hooks/use-toast";
import MultiImageUploader from "@/components/MultiImageUploader";
import { PageTransition } from "@/components/PageTransition";

type ModelType = "portrait" | "fullbody" | "fashion";
type TrainingFocus = "face" | "body" | "style";

interface ModelConfig {
  name: string;
  type: ModelType;
  focus: TrainingFocus;
}

const CreateCustomModel = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const [step, setStep] = useState(1);
  const [trainingImages, setTrainingImages] = useState<File[]>([]);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    name: "",
    type: "fullbody",
    focus: "face"
  });
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "This module is only available for admins",
        variant: "destructive"
      });
      navigate("/create");
    }
  }, [isAdmin, adminLoading, navigate]);

  const handleImagesUpload = (files: File[]) => {
    setTrainingImages(files);
    if (step < 2) setStep(2);
  };

  const handleStartTraining = () => {
    if (!modelConfig.name.trim()) {
      toast({
        title: "Model Name Required",
        description: "Please enter a name for your custom model",
        variant: "destructive"
      });
      return;
    }

    setIsTraining(true);
    toast({
      title: "Backend Integration Coming Soon",
      description: "Custom model training will be available soon"
    });
    setTimeout(() => {
      setIsTraining(false);
    }, 2000);
  };

  const hasMinImages = trainingImages.length >= 10;
  const canTrain = hasMinImages && modelConfig.name.trim().length > 0;

  const qualityChecks = [
    { label: "10+ images uploaded", passed: trainingImages.length >= 10 },
    { label: "Model name provided", passed: modelConfig.name.trim().length > 0 },
    { label: "Same person in all images", passed: trainingImages.length > 0 },
    { label: "Varied poses detected", passed: trainingImages.length >= 5 }
  ];

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <UserPlus className="h-8 w-8 text-orange-500" />
              Create Your Own Model
              <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">ADMIN</span>
            </h1>
            <p className="text-muted-foreground">
              Train custom base models from your photo sets
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full transition-colors ${
                step >= s ? "bg-orange-500" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Upload Training Images */}
            {step >= 1 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-sm">1</span>
                  Upload Training Images (10-20 required)
                </h2>
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-semibold mb-2">Training Set Requirements:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Same person in all photos</li>
                    <li>• Varied poses and angles</li>
                    <li>• Good lighting and image quality</li>
                    <li>• Clear face visibility in most images</li>
                  </ul>
                </div>
                <MultiImageUploader
                  onImagesSelect={handleImagesUpload}
                  selectedImages={trainingImages}
                  maxImages={20}
                />
                {trainingImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      {trainingImages.length} / 20 images uploaded
                    </p>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {trainingImages.map((file, idx) => (
                        <img
                          key={idx}
                          src={URL.createObjectURL(file)}
                          alt={`Training ${idx + 1}`}
                          className="w-full aspect-square object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Step 2: Model Configuration */}
            {step >= 2 && hasMinImages && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-sm">2</span>
                  Configure Model
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="modelName">Model Name *</Label>
                    <Input
                      id="modelName"
                      placeholder="e.g., Emma - Fashion Model"
                      value={modelConfig.name}
                      onChange={(e) => setModelConfig({ ...modelConfig, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Model Type</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {(["portrait", "fullbody", "fashion"] as ModelType[]).map((type) => (
                        <Button
                          key={type}
                          variant={modelConfig.type === type ? "default" : "outline"}
                          onClick={() => {
                            setModelConfig({ ...modelConfig, type });
                            if (step < 3) setStep(3);
                          }}
                          className={modelConfig.type === type ? "bg-orange-500 hover:bg-orange-600" : ""}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Training Focus</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {(["face", "body", "style"] as TrainingFocus[]).map((focus) => (
                        <Button
                          key={focus}
                          variant={modelConfig.focus === focus ? "default" : "outline"}
                          onClick={() => setModelConfig({ ...modelConfig, focus })}
                          className={modelConfig.focus === focus ? "bg-orange-500 hover:bg-orange-600" : ""}
                        >
                          {focus.charAt(0).toUpperCase() + focus.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 3: Review & Quality Check */}
            {step >= 3 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-sm">3</span>
                  Quality Check
                </h2>
                <div className="space-y-3">
                  {qualityChecks.map((check, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {check.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      )}
                      <span className={check.passed ? "text-foreground" : "text-muted-foreground"}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Step 4: Submit Training */}
            {step >= 3 && canTrain && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-sm">4</span>
                  Submit for Training
                </h2>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Your model will be trained using {trainingImages.length} images. 
                    Estimated training time: 15-30 minutes.
                  </p>
                  <Button
                    onClick={handleStartTraining}
                    disabled={!canTrain || isTraining}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {isTraining ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Starting Training...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Start Model Training
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Training Cost</h3>
              <p className="text-2xl font-bold text-orange-500">0 credits</p>
              <p className="text-xs text-muted-foreground mt-1">Backend integration coming soon</p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Tips for Best Results</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Upload 15-20 images for best quality</li>
                <li>• Include various poses and angles</li>
                <li>• Ensure consistent person across all</li>
                <li>• Use high-resolution images</li>
                <li>• Avoid heavy filters or edits</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default CreateCustomModel;
