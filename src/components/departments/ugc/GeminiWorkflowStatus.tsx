import React from 'react';
import { CheckCircle, Clock, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  icon: React.ReactNode;
}

interface GeminiWorkflowStatusProps {
  conversationId: string | null;
  isInitializing: boolean;
  isAnalyzingImage: boolean;
  isLoadingScenarios: boolean;
  hasImageAnalysis: boolean;
  hasScenarios: boolean;
  showSteps?: boolean;
}

export const GeminiWorkflowStatus: React.FC<GeminiWorkflowStatusProps> = ({
  conversationId,
  isInitializing,
  isAnalyzingImage,
  isLoadingScenarios,
  hasImageAnalysis,
  hasScenarios,
  showSteps = true
}) => {
  const steps: WorkflowStep[] = [
    {
      id: 'initialize',
      title: 'Initialize Conversation',
      description: 'Setting up AI conversation',
      status: conversationId ? 'completed' : isInitializing ? 'in-progress' : 'pending',
      icon: <Sparkles className="h-4 w-4" />
    },
    {
      id: 'analyze',
      title: 'Analyze Image',
      description: 'AI analyzing your product image',
      status: hasImageAnalysis ? 'completed' : isAnalyzingImage ? 'in-progress' : 'pending',
      icon: <Upload className="h-4 w-4" />
    },
    {
      id: 'scenarios',
      title: 'Generate Scenarios',
      description: 'Creating UGC scenario ideas',
      status: hasScenarios ? 'completed' : isLoadingScenarios ? 'in-progress' : 'pending',
      icon: <CheckCircle className="h-4 w-4" />
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress': return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!showSteps) {
    const currentStep = steps.find(step => step.status === 'in-progress');
    if (!currentStep) return null;

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {getStatusIcon(currentStep.status)}
        <span>{currentStep.description}...</span>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-3">Workflow Progress</h3>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {getStatusIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">{step.title}</h4>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(step.status)}`}
                  >
                    {step.status.replace('-', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="w-px h-6 bg-border ml-2" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};