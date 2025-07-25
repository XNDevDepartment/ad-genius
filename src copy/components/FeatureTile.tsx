import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FeatureTileProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  onClick: () => void;
  className?: string;
}

const FeatureTile = ({ 
  title, 
  description, 
  icon, 
  available, 
  onClick, 
  className 
}: FeatureTileProps) => {
  return (
    <div
      className={cn(
        "relative bg-card rounded-apple p-6 shadow-apple transition-spring hover:shadow-apple-lg",
        !available && "opacity-60",
        className
      )}
    >
      {!available && (
        <div className="absolute inset-0 bg-muted/50 rounded-apple flex items-center justify-center">
          <span className="bg-background px-3 py-1 rounded-apple-sm text-sm font-medium text-muted-foreground shadow-apple">
            Coming Soon
          </span>
        </div>
      )}
      
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 bg-primary/10 rounded-apple">
          {icon}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
        
        <Button
          variant={available ? "default" : "secondary"}
          className="mt-4"
          onClick={onClick}
          disabled={!available}
        >
          {available ? "Get Started" : "Notify Me"}
        </Button>
      </div>
    </div>
  );
};

export default FeatureTile;