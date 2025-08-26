
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ImageJob, useImageJobs } from '@/hooks/useImageJobs';
import { useToast } from '@/hooks/use-toast';

interface JobDetailsProps {
  jobId: string;
  onBack: () => void;
}

export const JobDetails = ({ jobId, onBack }: JobDetailsProps) => {
  const [job, setJob] = useState<ImageJob | null>(null);
  const [loading, setLoading] = useState(true);
  const { pollJobStatus } = useImageJobs();
  const { toast } = useToast();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchJobStatus = async () => {
      try {
        const updatedJob = await pollJobStatus(jobId);
        setJob(updatedJob);

        // Stop polling if job is completed
        if (updatedJob.status === 'succeeded' || updatedJob.status === 'failed') {
          clearInterval(intervalId);
          
          if (updatedJob.status === 'succeeded') {
            toast({
              title: "Imagem Gerada!",
              description: "Sua imagem foi gerada com sucesso.",
            });
          } else {
            toast({
              title: "Geração Falhou",
              description: updatedJob.error || "Houve um erro na geração da imagem.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch job status:', error);
        clearInterval(intervalId);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchJobStatus();

    // Poll every 2 seconds if job is not completed
    intervalId = setInterval(() => {
      if (job?.status === 'queued' || job?.status === 'in_progress') {
        fetchJobStatus();
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [jobId, job?.status, pollJobStatus, toast]);

  const getStatusIcon = (status: ImageJob['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'succeeded':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: ImageJob['status']) => {
    switch (status) {
      case 'queued':
        return 'Na Fila';
      case 'in_progress':
        return 'Processando';
      case 'succeeded':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
      default:
        return 'Desconhecido';
    }
  };

  const handleDownload = async () => {
    if (!job?.output_url) return;

    try {
      const response = await fetch(job.output_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ugc-job-${job.id}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download Falhou",
        description: "Não foi possível baixar a imagem.",
        variant: "destructive",
      });
    }
  };

  if (loading && !job) {
    return (
      <div className="p-4 lg:p-8 space-y-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          ← Voltar
        </Button>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 lg:p-8 space-y-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          ← Voltar
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p>Job não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        ← Voltar
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(job.status)}
              Job de Geração
            </CardTitle>
            <Badge variant={job.status === 'succeeded' ? 'default' : 'secondary'}>
              {getStatusText(job.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Prompt:</h3>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              {job.prompt}
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">Configurações:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tamanho:</span>
                <span className="ml-2">{job.settings.size || '1024x1024'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Qualidade:</span>
                <span className="ml-2">{job.settings.quality || 'standard'}</span>
              </div>
            </div>
          </div>

          {job.status === 'succeeded' && job.output_url && (
            <div>
              <h3 className="font-medium mb-2">Resultado:</h3>
              <div className="space-y-4">
                <img 
                  src={job.output_url} 
                  alt="Generated image"
                  className="w-full max-w-md mx-auto rounded-lg border"
                />
                <div className="flex justify-center">
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Imagem
                  </Button>
                </div>
              </div>
            </div>
          )}

          {job.status === 'failed' && job.error && (
            <div>
              <h3 className="font-medium mb-2 text-red-600">Erro:</h3>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {job.error}
              </p>
            </div>
          )}

          {(job.status === 'queued' || job.status === 'in_progress') && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {job.status === 'queued' 
                  ? 'Seu job está na fila de processamento...'
                  : 'Gerando sua imagem...'
                }
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-4 border-t">
            <div>Criado: {new Date(job.created_at).toLocaleString()}</div>
            <div>Atualizado: {new Date(job.updated_at).toLocaleString()}</div>
            <div>ID: {job.id}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
