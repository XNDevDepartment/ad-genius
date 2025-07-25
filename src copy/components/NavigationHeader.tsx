import { useState } from "react";
import { cn } from "@/lib/utils";

const NavigationHeader = () => {
  const [selectedFeature, setSelectedFeature] = useState("UGC");

  const features = [
    { id: "UGC", label: "UGC", available: true },
    // { id: "Shoot", label: "Shoot", available: false },
    // { id: "Edit", label: "Edit", available: false },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 p-apple lg:hidden">
      <div className="container-mobile">
        <h1 className="text-2xl font-bold mb-4">AI Product Studio</h1>
        
        {/* Feature Switcher - Segmented Control */}
        <div className="bg-card rounded-apple p-1 shadow-apple">
          <div className="flex">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => feature.available && setSelectedFeature(feature.id)}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium rounded-apple-sm transition-spring relative",
                  selectedFeature === feature.id && feature.available
                    ? "bg-primary text-primary-foreground shadow-apple"
                    : feature.available
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground opacity-50 cursor-not-allowed"
                )}
                disabled={!feature.available}
              >
                {feature.label}
                {!feature.available && (
                  <span className="absolute -top-1 -right-1 text-xs bg-secondary text-secondary-foreground px-1 rounded">
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavigationHeader;