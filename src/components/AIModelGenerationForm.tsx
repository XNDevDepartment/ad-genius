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
    nationality: string;
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
  const [nationality, setNationality] = useState<string>("");
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
    if (!name.trim() || !gender || !nationality || !ageRange || !bodyType || !skinTone || 
        !hairLength || !hairTexture || !hairColor || !eyes || !pose) {
      return;
    }

    const result = await onGenerate({
      name: name.trim(),
      gender,
      nationality,
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
    setNationality("");
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

  const isFormValid = name.trim() && gender && nationality && ageRange && bodyType && skinTone && 
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
                <SelectItem value="unisex">Unisex</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="gender-fluid">Gender-fluid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nationality/Ethnicity */}
          <div className="space-y-2">
            <Label htmlFor="ai-nationality">Nationality / Ethnicity *</Label>
            <Select value={nationality} onValueChange={setNationality}>
              <SelectTrigger>
                <SelectValue placeholder="Select nationality" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="mixed">Mixed Ethnicity</SelectItem>
                <SelectItem value="not-specified">Not Specified</SelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Africa</div>
                <SelectItem value="nigerian">Nigerian</SelectItem>
                <SelectItem value="ethiopian">Ethiopian</SelectItem>
                <SelectItem value="kenyan">Kenyan</SelectItem>
                <SelectItem value="south-african">South African</SelectItem>
                <SelectItem value="egyptian">Egyptian</SelectItem>
                <SelectItem value="moroccan">Moroccan</SelectItem>
                <SelectItem value="ghanaian">Ghanaian</SelectItem>
                <SelectItem value="senegalese">Senegalese</SelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Asia</div>
                <SelectItem value="chinese">Chinese</SelectItem>
                <SelectItem value="japanese">Japanese</SelectItem>
                <SelectItem value="korean">Korean</SelectItem>
                <SelectItem value="indian">Indian</SelectItem>
                <SelectItem value="pakistani">Pakistani</SelectItem>
                <SelectItem value="filipino">Filipino</SelectItem>
                <SelectItem value="vietnamese">Vietnamese</SelectItem>
                <SelectItem value="thai">Thai</SelectItem>
                <SelectItem value="indonesian">Indonesian</SelectItem>
                <SelectItem value="malay">Malay</SelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Europe</div>
                <SelectItem value="british">British</SelectItem>
                <SelectItem value="french">French</SelectItem>
                <SelectItem value="german">German</SelectItem>
                <SelectItem value="italian">Italian</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="russian">Russian</SelectItem>
                <SelectItem value="polish">Polish</SelectItem>
                <SelectItem value="greek">Greek</SelectItem>
                <SelectItem value="scandinavian">Scandinavian</SelectItem>
                <SelectItem value="irish">Irish</SelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Middle East</div>
                <SelectItem value="arab">Arab / Middle Eastern</SelectItem>
                <SelectItem value="turkish">Turkish</SelectItem>
                <SelectItem value="persian">Persian / Iranian</SelectItem>
                <SelectItem value="israeli">Israeli</SelectItem>
                <SelectItem value="lebanese">Lebanese</SelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Americas</div>
                <SelectItem value="mexican">Mexican</SelectItem>
                <SelectItem value="brazilian">Brazilian</SelectItem>
                <SelectItem value="colombian">Colombian</SelectItem>
                <SelectItem value="argentinian">Argentinian</SelectItem>
                <SelectItem value="cuban">Cuban</SelectItem>
                <SelectItem value="american">American (general)</SelectItem>
                <SelectItem value="canadian">Canadian</SelectItem>
                <SelectItem value="caribbean">Caribbean</SelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Pacific</div>
                <SelectItem value="australian">Australian</SelectItem>
                <SelectItem value="new-zealander">New Zealander</SelectItem>
                <SelectItem value="pacific-islander">Pacific Islander</SelectItem>
                <SelectItem value="polynesian">Polynesian</SelectItem>
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
                <SelectItem value="0-12 months">0-12 months (baby)</SelectItem>
                <SelectItem value="1-3">1-3 years (toddler)</SelectItem>
                <SelectItem value="4-7">4-7 years (young child)</SelectItem>
                <SelectItem value="8-12">8-12 years (child)</SelectItem>
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
                  <SelectItem value="petite">Petite</SelectItem>
                  <SelectItem value="slim">Slim</SelectItem>
                  <SelectItem value="athletic">Athletic</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="curvy">Curvy</SelectItem>
                  <SelectItem value="muscular">Muscular</SelectItem>
                  <SelectItem value="plus">Plus</SelectItem>
                  <SelectItem value="tall-slim">Tall & Slim</SelectItem>
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
                  <SelectItem value="very-fair">Type I - Very Fair</SelectItem>
                  <SelectItem value="fair">Type II - Fair</SelectItem>
                  <SelectItem value="medium">Type III - Medium</SelectItem>
                  <SelectItem value="olive">Type IV - Olive</SelectItem>
                  <SelectItem value="brown">Type V - Brown</SelectItem>
                  <SelectItem value="dark-brown">Type VI - Dark Brown to Black</SelectItem>
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
                    <SelectItem value="very-short">Very Short / Buzz</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="extra-long">Extra Long</SelectItem>
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
                    <SelectItem value="coily">Coily / Kinky</SelectItem>
                    <SelectItem value="afro">Afro</SelectItem>
                    <SelectItem value="braided">Braided</SelectItem>
                    <SelectItem value="bald">Bald</SelectItem>
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
                    <SelectItem value="chestnut">Chestnut</SelectItem>
                    <SelectItem value="auburn">Auburn</SelectItem>
                    <SelectItem value="blonde">Blonde</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="gray">Gray</SelectItem>
                    <SelectItem value="salt-pepper">Salt & Pepper</SelectItem>
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
                  <SelectItem value="amber">Amber</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                  <SelectItem value="heterochromia">Heterochromia</SelectItem>
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
                  <SelectItem value="standing">Standing</SelectItem>
                  <SelectItem value="sitting">Sitting</SelectItem>
                  <SelectItem value="walking">Walking</SelectItem>
                  <SelectItem value="leaning">Leaning</SelectItem>
                  <SelectItem value="arms-crossed">Arms Crossed</SelectItem>
                  <SelectItem value="hands-on-hips">Hands on Hips</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="fashion-runway">Fashion Runway</SelectItem>
                  <SelectItem value="profile">Profile View</SelectItem>
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
