import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AIModelGenerationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: {
    name: string;
    gender: string;
    ageRange: string;
    bodyType: string;
    height: number;
    skinTone: string;
    hair: { length: string; texture: string; color: string };
    eyes: string;
    pose: string;
    gentleSmile?: boolean;
  }) => Promise<any>;
  isGenerating: boolean;
}

export const AIModelGenerationForm = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
}: AIModelGenerationFormProps) => {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [ageRange, setAgeRange] = useState<string>("");
  const [bodyType, setBodyType] = useState<string>("");
  const [height, setHeight] = useState<number>(170);
  const [skinTone, setSkinTone] = useState<string>("");
  const [hairLength, setHairLength] = useState<string>("");
  const [hairTexture, setHairTexture] = useState<string>("");
  const [hairColor, setHairColor] = useState<string>("");
  const [eyes, setEyes] = useState<string>("");
  const [pose, setPose] = useState<string>("");
  const [gentleSmile, setGentleSmile] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!name.trim() || !gender || !ageRange || !bodyType || !skinTone || 
        !hairLength || !hairTexture || !hairColor || !eyes || !pose) {
      return;
    }

    const result = await onGenerate({
      name: name.trim(),
      gender,
      ageRange,
      bodyType,
      height,
      skinTone,
      hair: { length: hairLength, texture: hairTexture, color: hairColor },
      eyes,
      pose,
      gentleSmile,
    });

    if (result) {
      handleClose();
    }
  };

  const handleClose = () => {
    setName("");
    setGender("");
    setAgeRange("");
    setBodyType("");
    setHeight(170);
    setSkinTone("");
    setHairLength("");
    setHairTexture("");
    setHairColor("");
    setEyes("");
    setPose("");
    setGentleSmile(false);
    onClose();
  };

  const isFormValid = name.trim() && gender && ageRange && bodyType && skinTone && 
    hairLength && hairTexture && hairColor && eyes && pose;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Create Model with AI
            </DialogTitle>
            <Badge variant="secondary" className="text-sm">6 credits</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Model Name */}
          <div className="space-y-2">
            <Label htmlFor="ai-name">Model Name *</Label>
            <Input
              id="ai-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., AI Generated Model"
            />
          </div>

          {/* Gender/Identity */}
          <div className="space-y-2">
            <Label htmlFor="ai-gender">Gender / Identity *</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Age Range */}
          <div className="space-y-2">
            <Label htmlFor="ai-age">Age Range *</Label>
            <Select value={ageRange} onValueChange={setAgeRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select age range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-5">0-5 (baby)</SelectItem>
                <SelectItem value="6-12">6-12 (child)</SelectItem>
                <SelectItem value="13-17">13-17 (teen)</SelectItem>
                <SelectItem value="18-24">18-24</SelectItem>
                <SelectItem value="25-34">25-34</SelectItem>
                <SelectItem value="35-44">35-44</SelectItem>
                <SelectItem value="45-54">45-54</SelectItem>
                <SelectItem value="55-64">55-64</SelectItem>
                <SelectItem value="65+">65+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Body Characteristics Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold">Body Characteristics</h3>
            
            {/* Body Type */}
            <div className="space-y-2">
              <Label htmlFor="ai-body">Body Type *</Label>
              <Select value={bodyType} onValueChange={setBodyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select body type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slim">Slim</SelectItem>
                  <SelectItem value="athletic">Athletic</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="plus">Plus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Height */}
            <div className="space-y-2">
              <Label htmlFor="ai-height">Height (cm) *</Label>
              <Input
                id="ai-height"
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                min={100}
                max={220}
              />
            </div>

            {/* Skin Tone */}
            <div className="space-y-2">
              <Label htmlFor="ai-skin">Skin Tone (Fitzpatrick Scale) *</Label>
              <Select value={skinTone} onValueChange={setSkinTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select skin tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 – Very fair (pale)</SelectItem>
                  <SelectItem value="2">2 – Fair</SelectItem>
                  <SelectItem value="3">3 – Medium light</SelectItem>
                  <SelectItem value="4">4 – Medium</SelectItem>
                  <SelectItem value="5">5 – Tan / Brown</SelectItem>
                  <SelectItem value="6">6 – Deep / Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hair & Eyes Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold">Hair & Eyes</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hair Length */}
              <div className="space-y-2">
                <Label htmlFor="ai-hair-length">Hair Length *</Label>
                <Select value={hairLength} onValueChange={setHairLength}>
                  <SelectTrigger>
                    <SelectValue placeholder="Length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hair Texture */}
              <div className="space-y-2">
                <Label htmlFor="ai-hair-texture">Hair Texture *</Label>
                <Select value={hairTexture} onValueChange={setHairTexture}>
                  <SelectTrigger>
                    <SelectValue placeholder="Texture" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight">Straight</SelectItem>
                    <SelectItem value="wavy">Wavy</SelectItem>
                    <SelectItem value="curly">Curly</SelectItem>
                    <SelectItem value="buzz cut">Buzz cut</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hair Color */}
              <div className="space-y-2">
                <Label htmlFor="ai-hair-color">Hair Color *</Label>
                <Select value={hairColor} onValueChange={setHairColor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="black">Black</SelectItem>
                    <SelectItem value="brown">Brown</SelectItem>
                    <SelectItem value="blonde">Blonde</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="gray">Gray</SelectItem>
                    <SelectItem value="white">White</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Eye Color */}
            <div className="space-y-2">
              <Label htmlFor="ai-eyes">Eye Color *</Label>
              <Select value={eyes} onValueChange={setEyes}>
                <SelectTrigger>
                  <SelectValue placeholder="Select eye color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brown">Brown</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="hazel">Hazel</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pose Style Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold">Pose Style</h3>
            
            <div className="space-y-2">
              <Label htmlFor="ai-pose">Pose *</Label>
              <Select value={pose} onValueChange={setPose}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standing (front)">Standing (front)</SelectItem>
                  <SelectItem value="standing (3/4)">Standing (3/4)</SelectItem>
                  <SelectItem value="walking">Walking</SelectItem>
                  <SelectItem value="sitting upright">Sitting upright</SelectItem>
                  <SelectItem value="hands on hips">Hands on hips</SelectItem>
                  <SelectItem value="hands clasped front">Hands clasped front</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gentle Smile Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="ai-smile">Gentle Smile</Label>
                <p className="text-xs text-muted-foreground">Add a subtle smile to the model</p>
              </div>
              <Switch
                id="ai-smile"
                checked={gentleSmile}
                onCheckedChange={setGentleSmile}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isGenerating || !isFormValid}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Model (6 credits)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
