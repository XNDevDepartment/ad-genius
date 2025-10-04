import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKlingVideo } from '@/hooks/useKlingVideo';
import { useSourceImages } from '@/hooks/useSourceImages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, Loader2, Video, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TestVideoGeneration() {
  const navigate = useNavigate();
  const { job, loading, error, createVideoJob, cancelVideoJob, clearJob } = useKlingVideo();
  const { sourceImages, loading: loadingImages } = useSourceImages();

  const [selectedImageId, setSelectedImageId] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<5 | 10>(5);

  const handleGenerate = async () => {
    if (!selectedImageId || !prompt) return;

    await createVideoJob({
      source_image_id: selectedImageId,
      prompt,
      duration,
    });
  };

  const handleCancel = async () => {
    if (job?.id) {
      await cancelVideoJob(job.id);
    }
  };

  const getStatusIcon = () => {
    switch (job?.status) {
      case 'queued':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'canceled':
        return <X className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (job?.status) {
      case 'queued':
        return 'Your video is queued for generation...';
      case 'processing':
        return 'Generating your video... This may take 2-3 minutes.';
      case 'completed':
        return 'Video generated successfully!';
      case 'failed':
        return 'Video generation failed.';
      case 'canceled':
        return 'Video generation was canceled.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Video Generation Test</h1>
            <p className="text-muted-foreground">Test the Kling video generation API</p>
          </div>
        </div>

        {/* Configuration Form */}
        {!job && (
          <Card>
            <CardHeader>
              <CardTitle>Generate Video</CardTitle>
              <CardDescription>
                Select a source image and provide a prompt to generate a video
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Source Image Selection */}
              <div className="space-y-2">
                <Label>Source Image</Label>
                {loadingImages ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading images...
                  </div>
                ) : sourceImages.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No source images found. Upload an image first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Select value={selectedImageId} onValueChange={setSelectedImageId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an image" />
                      </SelectTrigger>
                      <SelectContent>
                      {sourceImages.map((img) => (
                        <SelectItem key={img.id} value={img.id}>
                          {img.fileName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedImageId && (
                    <div className="mt-4">
                      <img
                        src={sourceImages.find(img => img.id === selectedImageId)?.signedUrl}
                        alt="Selected"
                        className="w-full max-w-md rounded-lg border"
                      />
                    </div>
                  )}
                  </>
                )}
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the video animation you want to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={duration.toString()}
                  onValueChange={(val) => setDuration(parseInt(val) as 5 | 10)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 seconds (1 credits)</SelectItem>
                    <SelectItem value="5">5 seconds (5 credits)</SelectItem>
                    <SelectItem value="10">10 seconds (10 credits)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!selectedImageId || !prompt || loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Job...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Generate Video
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Job Status */}
        {job && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon()}
                    Video Generation Status
                  </CardTitle>
                  <CardDescription>{getStatusText()}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearJob}
                >
                  New Video
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Job Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Job ID:</span>
                  <span className="font-mono">{job.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="capitalize font-medium">{job.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{job.duration} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-mono text-xs">{job.model.split('/').pop()}</span>
                </div>
              </div>

              {/* Progress Bar */}
              {(job.status === 'queued' || job.status === 'processing') && (
                <div className="space-y-2">
                  <Progress value={job.status === 'queued' ? 10 : 50} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {job.status === 'queued' ? 'Waiting in queue...' : 'Processing video...'}
                  </p>
                </div>
              )}

              {/* Source Image */}
              {job.image_url && (
                <div className="space-y-2">
                  <Label>Source Image</Label>
                  <img
                    src={job.image_url}
                    alt="Source"
                    className="w-full max-w-md rounded-lg border"
                  />
                </div>
              )}

              {/* Prompt */}
              <div className="space-y-2">
                <Label>Prompt</Label>
                <p className="text-sm border rounded-lg p-3 bg-muted">{job.prompt}</p>
              </div>

              {/* Video Result */}
              {job.status === 'completed' && job.video_url && (
                <div className="space-y-2">
                  <Label>Generated Video</Label>
                  <video
                    src={job.video_url}
                    controls
                    className="w-full rounded-lg border"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(job.video_url!, '_blank')}
                  >
                    Open in New Tab
                  </Button>
                </div>
              )}

              {/* Error Details */}
              {job.status === 'failed' && job.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {job.error.message || 'An error occurred during video generation'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Cancel Button */}
              {(job.status === 'queued' || job.status === 'processing') && (
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  className="w-full"
                >
                  Cancel Generation
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal list-inside space-y-2">
              <li>Select a source image from your uploaded images</li>
              <li>Provide a prompt describing the video animation</li>
              <li>Choose video duration (5s or 10s)</li>
              <li>Click "Generate Video" to start the process</li>
              <li>Wait 2-3 minutes for the video to be generated</li>
              <li>View the result and download if needed</li>
            </ol>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="font-medium mb-1">Cost:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 5-second video: 5 credits</li>
                <li>• 10-second video: 10 credits</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
