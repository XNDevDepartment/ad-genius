
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, Loader2, Eye } from 'lucide-react';
import { useImageJobs } from '@/hooks/useImageJobs';

interface JobsListProps {
  onViewJob: (jobId: string) => void;
}

export const JobsList = ({ onViewJob }: JobsListProps) => {
  const { jobs, loading } = useImageJobs();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seus Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seus Jobs ({jobs.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum job encontrado.</p>
            <p className="text-sm">Crie sua primeira imagem para começar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(job.status)}
                      <Badge variant={job.status === 'succeeded' ? 'default' : 'secondary'}>
                        {getStatusText(job.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm truncate text-muted-foreground">
                      {job.prompt}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {job.settings.size || '1024x1024'} • {job.settings.quality || 'standard'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {job.status === 'succeeded' && job.output_url && (
                      <img 
                        src={job.output_url} 
                        alt="Preview"
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewJob(job.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
