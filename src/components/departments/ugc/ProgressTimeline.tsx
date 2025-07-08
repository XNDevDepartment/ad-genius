import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Sparkles } from "lucide-react";

export interface TimelineStep {
  id: string;
  label: string;
  status: 'pending' | 'current' | 'completed';
}

interface ProgressTimelineProps {
  steps: TimelineStep[];
  currentStepIndex: number;
}

export const ProgressTimeline = ({ steps, currentStepIndex }: ProgressTimelineProps) => {
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>

          {/* Timeline Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current';
              const isPending = step.status === 'pending';

              return (
                <div key={step.id} className="flex flex-col items-center gap-2 flex-1">
                  {/* Step Icon */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                    ${isCompleted 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : isCurrent 
                        ? 'bg-primary/20 border-primary text-primary animate-pulse' 
                        : 'bg-secondary border-border text-muted-foreground'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Sparkles className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>

                  {/* Step Label */}
                  <span className={`
                    text-xs text-center leading-tight
                    ${isCompleted 
                      ? 'text-primary font-medium' 
                      : isCurrent 
                        ? 'text-primary font-medium' 
                        : 'text-muted-foreground'
                    }
                  `}>
                    {step.label}
                  </span>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`
                      absolute h-0.5 top-4 left-1/2 w-full -translate-y-1/2 translate-x-4
                      ${index < currentStepIndex ? 'bg-primary' : 'bg-border'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};