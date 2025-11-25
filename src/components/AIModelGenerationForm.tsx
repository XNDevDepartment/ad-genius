import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
              {t('aiModelForm.title')}
            </DialogTitle>
            <Badge variant="secondary" className="text-sm">6 {t('aiModelForm.credits')}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Model Name */}
          <div className="space-y-2">
            <Label htmlFor="ai-name">{t('aiModelForm.modelName')} *</Label>
            <Input
              id="ai-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('aiModelForm.modelNamePlaceholder')}
            />
          </div>

          {/* Gender/Identity */}
          <div className="space-y-2">
            <Label htmlFor="ai-gender">{t('aiModelForm.genderIdentity')} *</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder={t('aiModelForm.selectGender')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">{t('aiModelForm.genders.female')}</SelectItem>
                <SelectItem value="male">{t('aiModelForm.genders.male')}</SelectItem>
                <SelectItem value="unisex">{t('aiModelForm.genders.unisex')}</SelectItem>
                <SelectItem value="non-binary">{t('aiModelForm.genders.nonBinary')}</SelectItem>
                <SelectItem value="gender-fluid">{t('aiModelForm.genders.genderFluid')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nationality/Ethnicity */}
          <div className="space-y-2">
            <Label htmlFor="ai-nationality">{t('aiModelForm.nationality')} *</Label>
            <Select value={nationality} onValueChange={setNationality}>
              <SelectTrigger>
                <SelectValue placeholder={t('aiModelForm.selectNationality')} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="mixed">{t('aiModelForm.nationalities.mixed')}</SelectItem>
                <SelectItem value="not-specified">{t('aiModelForm.nationalities.notSpecified')}</SelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('aiModelForm.nationalities.africa')}</div>
                <SelectItem value="nigerian">Nigerian</SelectItem>
                <SelectItem value="ethiopian">Ethiopian</SelectItem>
                <SelectItem value="kenyan">Kenyan</SelectItem>
                <SelectItem value="south-african">South African</SelectItem>
                <SelectItem value="egyptian">Egyptian</SelectItem>
                <SelectItem value="moroccan">Moroccan</SelectItem>
                <SelectItem value="ghanaian">Ghanaian</SelectItem>
                <SelectItem value="senegalese">Senegalese</SelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('aiModelForm.nationalities.asia')}</div>
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
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('aiModelForm.nationalities.europe')}</div>
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
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('aiModelForm.nationalities.middleEast')}</div>
                <SelectItem value="arab">Arab / Middle Eastern</SelectItem>
                <SelectItem value="turkish">Turkish</SelectItem>
                <SelectItem value="persian">Persian / Iranian</SelectItem>
                <SelectItem value="israeli">Israeli</SelectItem>
                <SelectItem value="lebanese">Lebanese</SelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('aiModelForm.nationalities.americas')}</div>
                <SelectItem value="mexican">Mexican</SelectItem>
                <SelectItem value="brazilian">Brazilian</SelectItem>
                <SelectItem value="colombian">Colombian</SelectItem>
                <SelectItem value="argentinian">Argentinian</SelectItem>
                <SelectItem value="cuban">Cuban</SelectItem>
                <SelectItem value="american">American (general)</SelectItem>
                <SelectItem value="canadian">Canadian</SelectItem>
                <SelectItem value="caribbean">Caribbean</SelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('aiModelForm.nationalities.pacific')}</div>
                <SelectItem value="australian">Australian</SelectItem>
                <SelectItem value="new-zealander">New Zealander</SelectItem>
                <SelectItem value="pacific-islander">Pacific Islander</SelectItem>
                <SelectItem value="polynesian">Polynesian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Age Range */}
          <div className="space-y-2">
            <Label htmlFor="ai-age">{t('aiModelForm.ageRange')} *</Label>
            <Select value={ageRange} onValueChange={setAgeRange}>
              <SelectTrigger>
                <SelectValue placeholder={t('aiModelForm.selectAgeRange')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-12 months">{t('aiModelForm.ageRanges.baby')}</SelectItem>
                <SelectItem value="1-3">{t('aiModelForm.ageRanges.toddler')}</SelectItem>
                <SelectItem value="4-7">{t('aiModelForm.ageRanges.youngChild')}</SelectItem>
                <SelectItem value="8-12">{t('aiModelForm.ageRanges.child')}</SelectItem>
                <SelectItem value="13-17">{t('aiModelForm.ageRanges.teen')}</SelectItem>
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
            <h3 className="text-sm font-semibold">{t('aiModelForm.bodyCharacteristics')}</h3>
            
            {/* Body Type */}
            <div className="space-y-2">
              <Label htmlFor="ai-body">{t('aiModelForm.bodyType')} *</Label>
              <Select value={bodyType} onValueChange={setBodyType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('aiModelForm.selectBodyType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petite">{t('aiModelForm.bodyTypes.petite')}</SelectItem>
                  <SelectItem value="slim">{t('aiModelForm.bodyTypes.slim')}</SelectItem>
                  <SelectItem value="athletic">{t('aiModelForm.bodyTypes.athletic')}</SelectItem>
                  <SelectItem value="average">{t('aiModelForm.bodyTypes.average')}</SelectItem>
                  <SelectItem value="curvy">{t('aiModelForm.bodyTypes.curvy')}</SelectItem>
                  <SelectItem value="muscular">{t('aiModelForm.bodyTypes.muscular')}</SelectItem>
                  <SelectItem value="plus">{t('aiModelForm.bodyTypes.plus')}</SelectItem>
                  <SelectItem value="tall-slim">{t('aiModelForm.bodyTypes.tallSlim')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Height */}
            <div className="space-y-2">
              <Label htmlFor="ai-height">{t('aiModelForm.height')} *</Label>
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
              <Label htmlFor="ai-skin">{t('aiModelForm.skinTone')} *</Label>
              <Select value={skinTone} onValueChange={setSkinTone}>
                <SelectTrigger>
                  <SelectValue placeholder={t('aiModelForm.selectSkinTone')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="very-fair">{t('aiModelForm.skinTones.veryFair')}</SelectItem>
                  <SelectItem value="fair">{t('aiModelForm.skinTones.fair')}</SelectItem>
                  <SelectItem value="medium">{t('aiModelForm.skinTones.medium')}</SelectItem>
                  <SelectItem value="olive">{t('aiModelForm.skinTones.olive')}</SelectItem>
                  <SelectItem value="brown">{t('aiModelForm.skinTones.brown')}</SelectItem>
                  <SelectItem value="dark-brown">{t('aiModelForm.skinTones.darkBrown')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hair & Eyes Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold">{t('aiModelForm.hairEyes')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hair Length */}
              <div className="space-y-2">
                <Label htmlFor="ai-hair-length">{t('aiModelForm.hairLength')} *</Label>
                <Select value={hairLength} onValueChange={setHairLength}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('aiModelForm.hairLength')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very-short">{t('aiModelForm.hairLengths.veryShort')}</SelectItem>
                    <SelectItem value="short">{t('aiModelForm.hairLengths.short')}</SelectItem>
                    <SelectItem value="medium">{t('aiModelForm.hairLengths.medium')}</SelectItem>
                    <SelectItem value="long">{t('aiModelForm.hairLengths.long')}</SelectItem>
                    <SelectItem value="extra-long">{t('aiModelForm.hairLengths.extraLong')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hair Texture */}
              <div className="space-y-2">
                <Label htmlFor="ai-hair-texture">{t('aiModelForm.hairTexture')} *</Label>
                <Select value={hairTexture} onValueChange={setHairTexture}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('aiModelForm.hairTexture')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight">{t('aiModelForm.hairTextures.straight')}</SelectItem>
                    <SelectItem value="wavy">{t('aiModelForm.hairTextures.wavy')}</SelectItem>
                    <SelectItem value="curly">{t('aiModelForm.hairTextures.curly')}</SelectItem>
                    <SelectItem value="coily">{t('aiModelForm.hairTextures.coily')}</SelectItem>
                    <SelectItem value="afro">{t('aiModelForm.hairTextures.afro')}</SelectItem>
                    <SelectItem value="braided">{t('aiModelForm.hairTextures.braided')}</SelectItem>
                    <SelectItem value="bald">{t('aiModelForm.hairTextures.bald')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hair Color */}
              <div className="space-y-2">
                <Label htmlFor="ai-hair-color">{t('aiModelForm.hairColor')} *</Label>
                <Select value={hairColor} onValueChange={setHairColor}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('aiModelForm.hairColor')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="black">{t('aiModelForm.hairColors.black')}</SelectItem>
                    <SelectItem value="brown">{t('aiModelForm.hairColors.brown')}</SelectItem>
                    <SelectItem value="chestnut">{t('aiModelForm.hairColors.chestnut')}</SelectItem>
                    <SelectItem value="auburn">{t('aiModelForm.hairColors.auburn')}</SelectItem>
                    <SelectItem value="blonde">{t('aiModelForm.hairColors.blonde')}</SelectItem>
                    <SelectItem value="platinum">{t('aiModelForm.hairColors.platinum')}</SelectItem>
                    <SelectItem value="red">{t('aiModelForm.hairColors.red')}</SelectItem>
                    <SelectItem value="gray">{t('aiModelForm.hairColors.gray')}</SelectItem>
                    <SelectItem value="salt-pepper">{t('aiModelForm.hairColors.saltPepper')}</SelectItem>
                    <SelectItem value="white">{t('aiModelForm.hairColors.white')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Eye Color */}
            <div className="space-y-2">
              <Label htmlFor="ai-eyes">{t('aiModelForm.eyeColor')} *</Label>
              <Select value={eyes} onValueChange={setEyes}>
                <SelectTrigger>
                  <SelectValue placeholder={t('aiModelForm.selectEyeColor')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brown">{t('aiModelForm.eyeColors.brown')}</SelectItem>
                  <SelectItem value="blue">{t('aiModelForm.eyeColors.blue')}</SelectItem>
                  <SelectItem value="green">{t('aiModelForm.eyeColors.green')}</SelectItem>
                  <SelectItem value="hazel">{t('aiModelForm.eyeColors.hazel')}</SelectItem>
                  <SelectItem value="amber">{t('aiModelForm.eyeColors.amber')}</SelectItem>
                  <SelectItem value="gray">{t('aiModelForm.eyeColors.gray')}</SelectItem>
                  <SelectItem value="black">{t('aiModelForm.eyeColors.black')}</SelectItem>
                  <SelectItem value="heterochromia">{t('aiModelForm.eyeColors.heterochromia')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pose Style Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold">{t('aiModelForm.poseStyle')}</h3>
            
            <div className="space-y-2">
              <Label htmlFor="ai-pose">{t('aiModelForm.pose')} *</Label>
              <Select value={pose} onValueChange={setPose}>
                <SelectTrigger>
                  <SelectValue placeholder={t('aiModelForm.selectPose')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standing">{t('aiModelForm.poses.standing')}</SelectItem>
                  <SelectItem value="sitting">{t('aiModelForm.poses.sitting')}</SelectItem>
                  <SelectItem value="walking">{t('aiModelForm.poses.walking')}</SelectItem>
                  <SelectItem value="leaning">{t('aiModelForm.poses.leaning')}</SelectItem>
                  <SelectItem value="arms-crossed">{t('aiModelForm.poses.armsCrossed')}</SelectItem>
                  <SelectItem value="hands-on-hips">{t('aiModelForm.poses.handsOnHips')}</SelectItem>
                  <SelectItem value="casual">{t('aiModelForm.poses.casual')}</SelectItem>
                  <SelectItem value="formal">{t('aiModelForm.poses.formal')}</SelectItem>
                  <SelectItem value="fashion-runway">{t('aiModelForm.poses.fashionRunway')}</SelectItem>
                  <SelectItem value="profile">{t('aiModelForm.poses.profile')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gentle Smile Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="ai-smile">{t('aiModelForm.gentleSmile')}</Label>
                <p className="text-xs text-muted-foreground">{t('aiModelForm.gentleSmileDesc')}</p>
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
              {t('aiModelForm.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isGenerating || !isFormValid}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('aiModelForm.generating')}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('aiModelForm.generate')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
