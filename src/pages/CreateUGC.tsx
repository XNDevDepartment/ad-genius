
import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import { JobDetails } from "@/components/departments/ugc/JobDetails";
import { JobsList } from "@/components/departments/ugc/JobsList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useImageJobs } from "@/hooks/useImageJobs";
import { useImageLimit } from "@/hooks/useImageLimit";
import { SettingsPanel, ImageSettings } from "@/components/departments/ugc/SettingsPanel";

export default function CreateUGC() {
  const [prompt, setPrompt] = useState("");
  const [selectedView, setSelectedView] = useState<'create' | 'job-details' | 'jobs-list'>('create');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ImageSettings>({
    size: "1024x1024",
    quality: "high" as const,
    numberOfImages: 1,
    format: "png" as const,
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const { createJob, loading } = useImageJobs();
  const { canGenerateImages, isAtLimit, remainingImages, calculateImageCost } = useImageLimit(settings.quality);

  const handleGenerate = async () => {
    if (!user) {
      toast({
        title: "Acesso Negado",
        description: "Faça login para gerar imagens.",
        variant: "destructive",
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Prompt Obrigatório",
        description: "Digite um prompt para gerar a imagem.",
        variant: "destructive",
      });
      return;
    }

    if (!canGenerateImages(settings.numberOfImages)) {
      const creditsNeeded = calculateImageCost(settings.quality, settings.numberOfImages);
      toast({
        title: "Créditos Insuficientes",
        description: `Você precisa de ${creditsNeeded} créditos, mas só tem ${remainingImages} disponíveis.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const job = await createJob(prompt, settings);
      
      toast({
        title: "Job Criado!",
        description: "Sua imagem está sendo processada.",
      });

      // Navigate to job details
      setSelectedJobId(job.id);
      setSelectedView('job-details');
      
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Erro na Geração",
        description: error instanceof Error ? error.message : "Houve um erro ao criar o job.",
        variant: "destructive",
      });
    }
  };

  const handleViewJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setSelectedView('job-details');
  };

  const handleBackToCreate = () => {
    setSelectedView('create');
    setSelectedJobId(null);
  };

  if (selectedView === 'job-details' && selectedJobId) {
    return (
      <JobDetails 
        jobId={selectedJobId} 
        onBack={handleBackToCreate}
      />
    );
  }

  if (selectedView === 'jobs-list') {
    return (
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBackToCreate}>
            ← Voltar para Criação
          </Button>
        </div>
        <JobsList onViewJob={handleViewJob} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Criador de UGC</h1>
            <p className="text-sm lg:text-base text-muted-foreground">
              Transforme suas ideias em conteúdo visual único
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={() => setSelectedView('jobs-list')}>
            <FileImage className="h-4 w-4 mr-2" />
            Meus Jobs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Creation Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Criar Imagem
              </CardTitle>
              <CardDescription>
                Descreva a imagem que deseja gerar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="prompt" className="text-sm font-medium">
                  Prompt de Geração
                </label>
                <div className="relative">
                  <Textarea
                    id="prompt"
                    placeholder="Descreva detalhadamente a imagem que você deseja criar..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] bg-background/50 pr-12"
                  />
                  <div className="absolute bottom-3 right-3">
                    <SettingsPanel settings={settings} onSettingsChange={setSettings} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Seja específico e detalhado para melhores resultados
                </p>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleGenerate}
                  disabled={loading || isAtLimit || !prompt.trim()}
                  className="w-full bg-gradient-primary hover:opacity-90 shadow-glow"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Criando Job...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Criar Job ({calculateImageCost(settings.quality, settings.numberOfImages)} créditos)
                    </>
                  )}
                </Button>
              </div>

              {isAtLimit && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  ⚠️ Você atingiu o limite de geração. Faça upgrade para continuar.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Créditos Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {remainingImages}
              </div>
              <p className="text-xs text-muted-foreground">
                imagens restantes
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
