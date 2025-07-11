
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Sparkles } from "lucide-react";

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
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <Card className="bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-sm border-border/40 shadow-lg">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Dynamic Progress Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Creation Progress</h3>
              <p className="text-xs text-muted-foreground">Step {currentStepIndex + 1} of {steps.length}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{Math.round(progressPercentage)}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="relative">
            <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Professional Step Timeline */}
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-border"></div>
            <div 
              className="absolute top-6 left-6 h-0.5 bg-gradient-to-r from-primary to-primary/60 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(0, (currentStepIndex / (steps.length - 1)) * 100)}%` }}
            ></div>

            <div className="flex justify-between items-start relative">
              {steps.map((step, index) => {
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';
                const stepNumber = index + 1;

                return (
                  <div key={step.id} className="flex flex-col items-center space-y-3 relative z-10">
                    {/* Step Circle */}
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 transform
                      ${isCompleted 
                        ? 'bg-primary text-primary-foreground shadow-primary/30 shadow-lg scale-110' 
                        : isCurrent 
                          ? 'bg-primary/20 text-primary border-2 border-primary animate-pulse shadow-primary/20 shadow-md scale-105' 
                          : 'bg-muted text-muted-foreground border border-border hover:border-primary/50'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : isCurrent ? (
                        <Sparkles className="h-5 w-5" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="text-center space-y-1 max-w-[80px]">
                      <div className={`
                        text-xs font-medium transition-colors duration-300
                        ${isCompleted 
                          ? 'text-primary' 
                          : isCurrent 
                            ? 'text-primary font-semibold' 
                            : 'text-muted-foreground'
                        }
                      `}>
                        {step.label}
                      </div>
                      
                      {/* Step Status */}
                      <div className={`
                        text-[10px] px-2 py-0.5 rounded-full transition-all duration-300
                        ${isCompleted 
                          ? 'bg-primary/10 text-primary' 
                          : isCurrent 
                            ? 'bg-primary/20 text-primary animate-pulse' 
                            : 'bg-muted/50 text-muted-foreground'
                        }
                      `}>
                        {isCompleted ? 'Done' : isCurrent ? 'Active' : 'Pending'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
