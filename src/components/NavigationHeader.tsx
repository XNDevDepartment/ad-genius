import { Brain } from "lucide-react";

const NavigationHeader = () => {
  return (
    <header className="bg-background/95 backdrop-blur-xl border-b border-border/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
          <Brain className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-lg">Genius UGC</h1>
          <p className="text-xs text-muted-foreground">Marketing com IA</p>
        </div>
      </div>
    </header>
  );
};

export default NavigationHeader;