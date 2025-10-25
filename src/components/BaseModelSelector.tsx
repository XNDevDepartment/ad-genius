import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBaseModels, BaseModel, BaseModelFilters } from "@/hooks/useBaseModels";
import { Upload, Check, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseModelSelectorProps {
  selectedModel: BaseModel | null;
  onSelectModel: (model: BaseModel) => void;
  showUpload?: boolean;
}

export const BaseModelSelector = ({
  selectedModel,
  onSelectModel,
  showUpload = false,
}: BaseModelSelectorProps) => {
  const { systemModels, userModels, loading, fetchSystemModels } = useBaseModels();
  const [filters, setFilters] = useState<BaseModelFilters>({});
  const [searchTerm, setSearchTerm] = useState("");

  const filteredModels = systemModels.filter((model) => {
    if (searchTerm && !model.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleFilterChange = (key: keyof BaseModelFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    fetchSystemModels(newFilters);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Gender</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.gender || ""}
            onChange={(e) => handleFilterChange("gender", e.target.value)}
          >
            <option value="">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="unisex">Unisex</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Body Type</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.bodyType || ""}
            onChange={(e) => handleFilterChange("bodyType", e.target.value)}
          >
            <option value="">All</option>
            <option value="slim">Slim</option>
            <option value="athletic">Athletic</option>
            <option value="average">Average</option>
            <option value="plus">Plus</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Pose</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.poseType || ""}
            onChange={(e) => handleFilterChange("poseType", e.target.value)}
          >
            <option value="">All</option>
            <option value="front">Front</option>
            <option value="side">Side</option>
            <option value="back">Back</option>
            <option value="angled">Angled</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Skin Tone</Label>
          <select
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            value={filters.skinTone || ""}
            onChange={(e) => handleFilterChange("skinTone", e.target.value)}
          >
            <option value="">All</option>
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="tan">Tan</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search models by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {/* Model Grid */}
      <ScrollArea className="h-[500px] w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
          {/* System Models */}
          {filteredModels.map((model) => (
            <Card
              key={model.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                selectedModel?.id === model.id && "ring-2 ring-primary"
              )}
              onClick={() => onSelectModel(model)}
            >
              <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
                <img
                  src={model.thumbnail_url || model.public_url}
                  alt={model.name}
                  className="w-full h-full object-cover"
                />
                {selectedModel?.id === model.id && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2" variant="secondary">
                  <Sparkles className="w-3 h-3 mr-1" />
                  System
                </Badge>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate">{model.name}</h3>
                <div className="flex flex-wrap gap-1 mt-2">
                  {model.gender && (
                    <Badge variant="outline" className="text-xs">
                      {model.gender}
                    </Badge>
                  )}
                  {model.body_type && (
                    <Badge variant="outline" className="text-xs">
                      {model.body_type}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* User Models */}
          {userModels.map((model) => (
            <Card
              key={model.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                selectedModel?.id === model.id && "ring-2 ring-primary"
              )}
              onClick={() => onSelectModel(model)}
            >
              <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
                <img
                  src={model.thumbnail_url || model.public_url}
                  alt={model.name}
                  className="w-full h-full object-cover"
                />
                {selectedModel?.id === model.id && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2" variant="default">
                  <User className="w-3 h-3 mr-1" />
                  Your Model
                </Badge>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate">{model.name}</h3>
                <div className="flex flex-wrap gap-1 mt-2">
                  {model.gender && (
                    <Badge variant="outline" className="text-xs">
                      {model.gender}
                    </Badge>
                  )}
                  {model.body_type && (
                    <Badge variant="outline" className="text-xs">
                      {model.body_type}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Upload Card (Premium) */}
          {showUpload && (
            <Card className="cursor-pointer transition-all hover:shadow-lg border-dashed">
              <div className="aspect-[3/4] flex items-center justify-center flex-col gap-3 p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Upload Your Model</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Premium feature
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Upload
                </Button>
              </div>
            </Card>
          )}
        </div>

        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading models...
          </div>
        )}

        {!loading && filteredModels.length === 0 && userModels.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No models found
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
