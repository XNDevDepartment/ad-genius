// Studio thumbnails
import studioWhite from '@/assets/backgrounds/studio/white.webp';
import studioBlack from '@/assets/backgrounds/studio/black.webp';
import studioGray from '@/assets/backgrounds/studio/white-darkgrey.webp';
import studioPink from '@/assets/backgrounds/studio/pink.webp';

import modelStudioWhite from '@/assets/backgrounds/studio/modelWhite.webp';
import modelStudioBlack from '@/assets/backgrounds/studio/modelBlack.webp';
import modelStudioGray from '@/assets/backgrounds/studio/modelWhite-darkgrey.webp';
import modelStudioPink from '@/assets/backgrounds/studio/modelPink.webp';

// Lifestyle thumbnails
import lifestyleLiving from '@/assets/backgrounds/lifestyle/livingroom.webp';
import lifestyleKitchen from '@/assets/backgrounds/lifestyle/kitchen.webp';
import lifestyleBedroom from '@/assets/backgrounds/lifestyle/bedroom.webp';
import lifestyleOffice from '@/assets/backgrounds/lifestyle/desk.webp';

// Magazine thumbnails
import magazineEditorial from '@/assets/backgrounds/magazine/editorial.webp';
import magazineFashion from '@/assets/backgrounds/magazine/studio.webp';
import magazineMinimal from '@/assets/backgrounds/magazine/minimal.webp';
import magazineVogue from '@/assets/backgrounds/magazine/vogue.webp';
import modelMagazineEditorial from '@/assets/backgrounds/magazine/editorial.webp';
import modelMagazineFashion from '@/assets/backgrounds/magazine/studio.webp';
import modelMagazineMinimal from '@/assets/backgrounds/magazine/minimal.webp';
import modelMagazineVogue from '@/assets/backgrounds/magazine/vogue.webp';

// Nature thumbnails
import natureBeach from '@/assets/backgrounds/nature/beach.png';
import natureForest from '@/assets/backgrounds/nature/forest.png';
import natureGarden from '@/assets/backgrounds/nature/garden.png';
import natureMountain from '@/assets/backgrounds/nature/mountains.png';

// Urban thumbnails
import urbanCafe from '@/assets/backgrounds/urban/coffe.png';
import urbanStreet from '@/assets/backgrounds/urban/street.png';
import urbanRooftop from '@/assets/backgrounds/urban/rooftop.png';
import urbanSubway from '@/assets/backgrounds/urban/subway.png';

// Seasonal thumbnails
import seasonalChristmas from '@/assets/backgrounds/seasonal/christmas.webp';
import seasonalSummer from '@/assets/backgrounds/seasonal/summer.webp';
import seasonalAutumn from '@/assets/backgrounds/seasonal/autumn.webp';
import seasonalSpring from '@/assets/backgrounds/seasonal/spring.webp';
import modelSeasonalChristmas from '@/assets/backgrounds/seasonal/christmas.webp';
import modelSeasonalSummer from '@/assets/backgrounds/seasonal/summer.webp';
import modelSeasonalAutumn from '@/assets/backgrounds/seasonal/autumn.webp';
import modelSeasonalSpring from '@/assets/backgrounds/seasonal/spring.webp';

export type BackgroundCategory = 
  | 'lifestyle' 
  | 'studio' 
  | 'magazine' 
  | 'nature' 
  | 'urban'
  | 'seasonal';

export interface BackgroundPreset {
  id: string;
  name: string;
  nameKey: string;
  promptKey: string;
  category: BackgroundCategory;
  thumbnail: string;
  prompt: string;
}

export const backgroundCategories: Record<BackgroundCategory, {
  labelKey: string;
  descriptionKey: string;
  icon: string;
}> = {
  lifestyle: { 
    labelKey: 'bulkBackground.categories.lifestyle', 
    descriptionKey: 'Home, everyday scenes',
    icon: 'Home' 
  },
  studio: { 
    labelKey: 'bulkBackground.categories.studio', 
    descriptionKey: 'Professional backdrops',
    icon: 'Camera' 
  },
  magazine: { 
    labelKey: 'bulkBackground.categories.magazine', 
    descriptionKey: 'Editorial & fashion',
    icon: 'BookOpen' 
  },
  nature: { 
    labelKey: 'bulkBackground.categories.nature', 
    descriptionKey: 'Outdoor natural settings',
    icon: 'TreeDeciduous' 
  },
  urban: { 
    labelKey: 'bulkBackground.categories.urban', 
    descriptionKey: 'City & street scenes',
    icon: 'Building2' 
  },
  seasonal: { 
    labelKey: 'bulkBackground.categories.seasonal', 
    descriptionKey: 'Holiday & seasonal themes',
    icon: 'Snowflake' 
  }
};

export const backgroundPresets: BackgroundPreset[] = [
  // Studio
  { id: 'white-seamless', name: 'White Seamless', nameKey: 'bulkBackground.presets.white-seamless', promptKey: 'bulkBackground.prompts.white-seamless', category: 'studio', thumbnail: studioWhite, prompt: 'Place the product on a clean white seamless paper studio background with soft even lighting, professional product photography style' },
  { id: 'black-studio', name: 'Black Studio', nameKey: 'bulkBackground.presets.black-studio', promptKey: 'bulkBackground.prompts.black-studio', category: 'studio', thumbnail: studioBlack, prompt: 'Place the product on a matte black studio background with dramatic rim lighting, high-end product photography' },
  { id: 'gradient-gray', name: 'Gray Gradient', nameKey: 'bulkBackground.presets.gradient-gray', promptKey: 'bulkBackground.prompts.gradient-gray', category: 'studio', thumbnail: studioGray, prompt: 'Place the product on a smooth gray gradient backdrop fading from light to dark, professional catalog photography' },
  { id: 'soft-pink', name: 'Soft Pink', nameKey: 'bulkBackground.presets.soft-pink', promptKey: 'bulkBackground.prompts.soft-pink', category: 'studio', thumbnail: studioPink, prompt: 'Place the product on a soft pastel pink backdrop with feminine aesthetic, beauty product photography style' },

  // Lifestyle
  { id: 'living-room', name: 'Modern Living Room', nameKey: 'bulkBackground.presets.living-room', promptKey: 'bulkBackground.prompts.living-room', category: 'lifestyle', thumbnail: lifestyleLiving, prompt: 'Place the product in a modern minimalist living room setting with natural light from large windows, lifestyle product photography' },
  { id: 'kitchen', name: 'Bright Kitchen', nameKey: 'bulkBackground.presets.kitchen', promptKey: 'bulkBackground.prompts.kitchen', category: 'lifestyle', thumbnail: lifestyleKitchen, prompt: 'Place the product on a bright kitchen countertop with marble surface and natural daylight, home lifestyle photography' },
  { id: 'bedroom', name: 'Cozy Bedroom', nameKey: 'bulkBackground.presets.bedroom', promptKey: 'bulkBackground.prompts.bedroom', category: 'lifestyle', thumbnail: lifestyleBedroom, prompt: 'Place the product in a cozy bedroom setting with soft neutral bedding and warm ambient lighting' },
  { id: 'home-office', name: 'Home Office', nameKey: 'bulkBackground.presets.home-office', promptKey: 'bulkBackground.prompts.home-office', category: 'lifestyle', thumbnail: lifestyleOffice, prompt: 'Place the product on a modern home office desk with plants and minimal decor, professional yet homey setting' },

  // Nature
  { id: 'beach', name: 'Beach Scene', nameKey: 'bulkBackground.presets.beach', promptKey: 'bulkBackground.prompts.beach', category: 'nature', thumbnail: natureBeach, prompt: 'Place the product on a sandy beach with ocean waves in the background, golden hour sunlight, vacation lifestyle' },
  { id: 'forest', name: 'Forest Path', nameKey: 'bulkBackground.presets.forest', promptKey: 'bulkBackground.prompts.forest', category: 'nature', thumbnail: natureForest, prompt: 'Place the product in a serene forest setting with dappled sunlight filtering through trees, natural and organic feel' },
  { id: 'garden', name: 'Garden Setting', nameKey: 'bulkBackground.presets.garden', promptKey: 'bulkBackground.prompts.garden', category: 'nature', thumbnail: natureGarden, prompt: 'Place the product in a lush garden with colorful flowers and greenery, fresh spring atmosphere' },
  { id: 'mountain', name: 'Mountain View', nameKey: 'bulkBackground.presets.mountain', promptKey: 'bulkBackground.prompts.mountain', category: 'nature', thumbnail: natureMountain, prompt: 'Place the product with majestic mountain landscape in the background, adventure and outdoor lifestyle' },

  // Urban
  { id: 'cafe', name: 'Coffee Shop', nameKey: 'bulkBackground.presets.cafe', promptKey: 'bulkBackground.prompts.cafe', category: 'urban', thumbnail: urbanCafe, prompt: 'Place the product on a rustic coffee shop table with warm ambient lighting and bokeh background, urban lifestyle' },
  { id: 'street', name: 'Street Style', nameKey: 'bulkBackground.presets.street', promptKey: 'bulkBackground.prompts.street', category: 'urban', thumbnail: urbanStreet, prompt: 'Place the product in an urban street setting with city architecture and natural daylight, streetwear aesthetic' },
  { id: 'rooftop', name: 'Rooftop View', nameKey: 'bulkBackground.presets.rooftop', promptKey: 'bulkBackground.prompts.rooftop', category: 'urban', thumbnail: urbanRooftop, prompt: 'Place the product on a rooftop terrace with city skyline in the background, sophisticated urban setting' },
  { id: 'subway', name: 'Metro Station', nameKey: 'bulkBackground.presets.subway', promptKey: 'bulkBackground.prompts.subway', category: 'urban', thumbnail: urbanSubway, prompt: 'Place the product in a modern metro station with clean lines and urban commuter atmosphere' },

  // Magazine
  { id: 'editorial', name: 'Editorial Setup', nameKey: 'bulkBackground.presets.editorial', promptKey: 'bulkBackground.prompts.editorial', category: 'magazine', thumbnail: magazineEditorial, prompt: 'Place the product in a high-fashion editorial setup with dramatic lighting and artistic composition, magazine cover quality' },
  { id: 'fashion', name: 'Fashion Studio', nameKey: 'bulkBackground.presets.fashion', promptKey: 'bulkBackground.prompts.fashion', category: 'magazine', thumbnail: magazineFashion, prompt: 'Place the product in a fashion photography studio with seamless background and professional studio lighting' },
  { id: 'minimal', name: 'Minimalist', nameKey: 'bulkBackground.presets.minimal', promptKey: 'bulkBackground.prompts.minimal', category: 'magazine', thumbnail: magazineMinimal, prompt: 'Place the product in an ultra-minimalist setting with lots of negative space, clean Scandinavian aesthetic' },
  { id: 'vogue', name: 'Vogue Style', nameKey: 'bulkBackground.presets.vogue', promptKey: 'bulkBackground.prompts.vogue', category: 'magazine', thumbnail: magazineVogue, prompt: 'Place the product in a luxurious Vogue-inspired setting with high-end aesthetic and dramatic fashion lighting' },

  // Seasonal
  { id: 'christmas', name: 'Christmas Scene', nameKey: 'bulkBackground.presets.christmas', promptKey: 'bulkBackground.prompts.christmas', category: 'seasonal', thumbnail: seasonalChristmas, prompt: 'Place the product in a festive Christmas setting with decorated tree, warm lights, and cozy holiday atmosphere' },
  { id: 'summer', name: 'Summer Vibes', nameKey: 'bulkBackground.presets.summer', promptKey: 'bulkBackground.prompts.summer', category: 'seasonal', thumbnail: seasonalSummer, prompt: 'Place the product in a bright summer setting with tropical vibes, sunshine, and vacation atmosphere' },
  { id: 'autumn', name: 'Autumn Leaves', nameKey: 'bulkBackground.presets.autumn', promptKey: 'bulkBackground.prompts.autumn', category: 'seasonal', thumbnail: seasonalAutumn, prompt: 'Place the product surrounded by colorful autumn leaves with warm fall lighting and cozy seasonal feel' },
  { id: 'spring', name: 'Spring Garden', nameKey: 'bulkBackground.presets.spring', promptKey: 'bulkBackground.prompts.spring', category: 'seasonal', thumbnail: seasonalSpring, prompt: 'Place the product in a fresh spring garden with blooming flowers, soft pastel colors, and new growth' }
];
export const modelBackgroundPresets: BackgroundPreset[] = [
  // Studio
  { id: 'white-seamless', name: 'White Seamless', nameKey: 'bulkBackground.presets.white-seamless', promptKey: 'bulkBackground.prompts.white-seamless', category: 'studio', thumbnail: modelStudioWhite, prompt: 'Place the model on a clean white seamless paper studio background with soft even lighting, professional product photography style' },
  { id: 'black-studio', name: 'Black Studio', nameKey: 'bulkBackground.presets.black-studio', promptKey: 'bulkBackground.prompts.black-studio', category: 'studio', thumbnail: modelStudioBlack, prompt: 'Place the model on a matte black studio background with dramatic rim lighting, high-end product photography' },
  { id: 'gradient-gray', name: 'Gray Gradient', nameKey: 'bulkBackground.presets.gradient-gray', promptKey: 'bulkBackground.prompts.gradient-gray', category: 'studio', thumbnail: modelStudioGray, prompt: 'Place the model on a smooth gray gradient backdrop fading from light to dark, professional catalog photography' },
  { id: 'soft-pink', name: 'Soft Pink', nameKey: 'bulkBackground.presets.soft-pink', promptKey: 'bulkBackground.prompts.soft-pink', category: 'studio', thumbnail: modelStudioPink, prompt: 'Place the model on a soft pastel pink backdrop with feminine aesthetic, beauty product photography style' },

  // Magazine
  { id: 'editorial', name: 'Editorial Setup', nameKey: 'bulkBackground.presets.editorial', promptKey: 'bulkBackground.prompts.editorial', category: 'magazine', thumbnail: magazineEditorial, prompt: 'Place the model in a high-fashion editorial setup with dramatic lighting and artistic composition, magazine cover quality' },
  { id: 'fashion', name: 'Fashion Studio', nameKey: 'bulkBackground.presets.fashion', promptKey: 'bulkBackground.prompts.fashion', category: 'magazine', thumbnail: magazineFashion, prompt: 'Place the model in a fashion photography studio with seamless background and professional studio lighting' },
  { id: 'minimal', name: 'Minimalist', nameKey: 'bulkBackground.presets.minimal', promptKey: 'bulkBackground.prompts.minimal', category: 'magazine', thumbnail: magazineMinimal, prompt: 'Place the model in an ultra-minimalist setting with lots of negative space, clean Scandinavian aesthetic' },
  { id: 'vogue', name: 'Vogue Style', nameKey: 'bulkBackground.presets.vogue', promptKey: 'bulkBackground.prompts.vogue', category: 'magazine', thumbnail: magazineVogue, prompt: 'Place the model in a luxurious Vogue-inspired setting with high-end aesthetic and dramatic fashion lighting' },

  // Seasonal
  { id: 'christmas', name: 'Christmas Scene', nameKey: 'bulkBackground.presets.christmas', promptKey: 'bulkBackground.prompts.christmas', category: 'seasonal', thumbnail: seasonalChristmas, prompt: 'Place the model in a festive Christmas setting with decorated tree, warm lights, and cozy holiday atmosphere' },
  { id: 'summer', name: 'Summer Vibes', nameKey: 'bulkBackground.presets.summer', promptKey: 'bulkBackground.prompts.summer', category: 'seasonal', thumbnail: seasonalSummer, prompt: 'Place the model in a bright summer setting with tropical vibes, sunshine, and vacation atmosphere' },
  { id: 'autumn', name: 'Autumn Leaves', nameKey: 'bulkBackground.presets.autumn', promptKey: 'bulkBackground.prompts.autumn', category: 'seasonal', thumbnail: seasonalAutumn, prompt: 'Place the model surrounded by colorful autumn leaves with warm fall lighting and cozy seasonal feel' },
  { id: 'spring', name: 'Spring Garden', nameKey: 'bulkBackground.presets.spring', promptKey: 'bulkBackground.prompts.spring', category: 'seasonal', thumbnail: seasonalSpring, prompt: 'Place the model in a fresh spring garden with blooming flowers, soft pastel colors, and new growth' }
];

export const getCategoryIcon = (category: BackgroundCategory): string => {
  return backgroundCategories[category].icon;
};

export const getPresetsByCategory = (category: BackgroundCategory): BackgroundPreset[] => {
  return backgroundPresets.filter(preset => preset.category === category);
};
