import { cn } from "@/lib/utils";

interface Scenario {
  id: string;
  label: string;
  emoji: string;
}

interface ScenarioChipsProps {
  scenarios: Scenario[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const ScenarioChips = ({ scenarios, selected, onChange }: ScenarioChipsProps) => {
  const handleToggle = (scenarioId: string) => {
    if (selected.includes(scenarioId)) {
      onChange(selected.filter(id => id !== scenarioId));
    } else {
      onChange([...selected, scenarioId]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Suggestions
      </label>
      
      <div className="flex flex-wrap gap-2">
        {scenarios.map((scenario) => {
          const isSelected = selected.includes(scenario.id);
          
          return (
            <button
              key={scenario.id}
              onClick={() => handleToggle(scenario.id)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-apple-sm text-sm font-medium transition-spring border",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-apple"
                  : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <span className="text-base">{scenario.emoji}</span>
              {scenario.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ScenarioChips;