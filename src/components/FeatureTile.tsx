import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeatureTileProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  onClick?: () => void;
  className?: string;
}

const FeatureTile = ({ title, description, icon, available, onClick, className }: FeatureTileProps) => {
  return (
    <div 
      className={cn(
        "bg-card rounded-apple p-6 shadow-apple hover:shadow-apple-lg transition-spring cursor-pointer",
        !available && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={available ? onClick : undefined}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-apple-sm flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-lg text-foreground">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
          {available && (
            <Button variant="outline" size="sm" className="mt-3">
              Get Started
            </Button>
          )}
          {!available && (
            <span className="text-xs text-muted-foreground">Coming Soon</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureTile;