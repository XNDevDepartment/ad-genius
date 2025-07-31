import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Clock, CheckCircle, XCircle, Pause } from 'lucide-react';
import { GenerationJob } from '@/hooks/useGenerationJobs';

interface GenerationJobStatusProps {
  job: GenerationJob;
  onCancel?: (jobId: string) => void;
}

export const GenerationJobStatus = ({ job, onCancel }: GenerationJobStatusProps) => {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!onCancel) return;
    setCancelling(true);
    try {
      await onCancel(job.id);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'cancelled':
        return <Pause className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              Generation Job
              <Badge variant={getStatusColor()}>
                {job.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardTitle>
          {job.status === 'pending' || job.status === 'in_progress' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
              className="h-8 w-8 p-0"
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Prompt:</p>
          <p className="text-sm line-clamp-2">{job.prompt}</p>
        </div>

        {job.status === 'in_progress' && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Generated {job.generated_images_count} of {job.total_images} images
            </p>
          </div>
        )}

        {job.status === 'completed' && (
          <div>
            <p className="text-sm text-muted-foreground">
              ✅ Generated {job.generated_images_count} image{job.generated_images_count !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {job.status === 'failed' && job.error_message && (
          <div>
            <p className="text-sm text-destructive">
              Error: {job.error_message}
            </p>
          </div>
        )}

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Started: {formatTimeAgo(job.created_at)}</span>
          {job.completed_at && (
            <span>Completed: {formatTimeAgo(job.completed_at)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};