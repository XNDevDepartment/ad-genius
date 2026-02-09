// Studio thumbnails
import studioWhite from '@/assets/backgrounds/studio/Gemini_Generated_Image_ik2lirik2lirik2l.png';
import studioBlack from '@/assets/backgrounds/studio/Gemini_Generated_Image_n1ilw2n1ilw2n1il.png';
import studioGray from '@/assets/backgrounds/studio/Gemini_Generated_Image_rwemv5rwemv5rwem.png';
import studioPink from '@/assets/backgrounds/studio/Gemini_Generated_Image_s37udls37udls37u.png';

// Lifestyle thumbnails
import lifestyleLiving from '@/assets/backgrounds/lifestyle/Gemini_Generated_Image_t0rg8yt0rg8yt0rg.png';
import lifestyleKitchen from '@/assets/backgrounds/lifestyle/Gemini_Generated_Image_w3po0ow3po0ow3po.png';
import lifestyleBedroom from '@/assets/backgrounds/lifestyle/Gemini_Generated_Image_wta9vtwta9vtwta9.png';
import lifestyleOffice from '@/assets/backgrounds/lifestyle/Gemini_Generated_Image_xals7rxals7rxals.png';

// Magazine thumbnails
import magazineEditorial from '@/assets/backgrounds/magazine/Gemini_Generated_Image_2gp0c52gp0c52gp0.png';
import magazineFashion from '@/assets/backgrounds/magazine/Gemini_Generated_Image_8evys58evys58evy.png';
import magazineMinimal from '@/assets/backgrounds/magazine/Gemini_Generated_Image_u6gh6ou6gh6ou6gh.png';
import magazineVogue from '@/assets/backgrounds/magazine/Gemini_Generated_Image_xnddxlxnddxlxndd.png';

// Nature thumbnails
import natureBeach from '@/assets/backgrounds/nature/Gemini_Generated_Image_a4whwba4whwba4wh.png';
import natureForest from '@/assets/backgrounds/nature/Gemini_Generated_Image_bh41z7bh41z7bh41.png';
import natureGarden from '@/assets/backgrounds/nature/Gemini_Generated_Image_qan62qqan62qqan6.png';
import natureMountain from '@/assets/backgrounds/nature/Gemini_Generated_Image_wp14twp14twp14tw.png';

// Urban thumbnails
import urbanCafe from '@/assets/backgrounds/urban/Gemini_Generated_Image_5ya0s35ya0s35ya0.png';
import urbanStreet from '@/assets/backgrounds/urban/Gemini_Generated_Image_beywvtbeywvtbeyw.png';
import urbanRooftop from '@/assets/backgrounds/urban/Gemini_Generated_Image_pj2w64pj2w64pj2w.png';
import urbanSubway from '@/assets/backgrounds/urban/Gemini_Generated_Image_rwcp65rwcp65rwcp.png';

// Seasonal thumbnails
import seasonalChristmas from '@/assets/backgrounds/seasonal/Gemini_Generated_Image_2ymyhm2ymyhm2ymy.png';
import seasonalSummer from '@/assets/backgrounds/seasonal/Gemini_Generated_Image_7hdi067hdi067hdi.png';
import seasonalAutumn from '@/assets/backgrounds/seasonal/Gemini_Generated_Image_mm71jqmm71jqmm71.png';
import seasonalSpring from '@/assets/backgrounds/seasonal/Gemini_Generated_Image_smjpkzsmjpkzsmjp.png';

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
  { id: 'white-seamless', name: 'White Seamless', category: 'studio', thumbnail: studioWhite, prompt: 'Place the product on a clean white seamless paper studio background with soft even lighting, professional product photography style' },
  { id: 'black-studio', name: 'Black Studio', category: 'studio', thumbnail: studioBlack, prompt: 'Place the product on a matte black studio background with dramatic rim lighting, high-end product photography' },
  { id: 'gradient-gray', name: 'Gray Gradient', category: 'studio', thumbnail: studioGray, prompt: 'Place the product on a smooth gray gradient backdrop fading from light to dark, professional catalog photography' },
  { id: 'soft-pink', name: 'Soft Pink', category: 'studio', thumbnail: studioPink, prompt: 'Place the product on a soft pastel pink backdrop with feminine aesthetic, beauty product photography style' },

  // Lifestyle
  { id: 'living-room', name: 'Modern Living Room', category: 'lifestyle', thumbnail: lifestyleLiving, prompt: 'Place the product in a modern minimalist living room setting with natural light from large windows, lifestyle product photography' },
  { id: 'kitchen', name: 'Bright Kitchen', category: 'lifestyle', thumbnail: lifestyleKitchen, prompt: 'Place the product on a bright kitchen countertop with marble surface and natural daylight, home lifestyle photography' },
  { id: 'bedroom', name: 'Cozy Bedroom', category: 'lifestyle', thumbnail: lifestyleBedroom, prompt: 'Place the product in a cozy bedroom setting with soft neutral bedding and warm ambient lighting' },
  { id: 'home-office', name: 'Home Office', category: 'lifestyle', thumbnail: lifestyleOffice, prompt: 'Place the product on a modern home office desk with plants and minimal decor, professional yet homey setting' },

  // Nature
  { id: 'beach', name: 'Beach Scene', category: 'nature', thumbnail: natureBeach, prompt: 'Place the product on a sandy beach with ocean waves in the background, golden hour sunlight, vacation lifestyle' },
  { id: 'forest', name: 'Forest Path', category: 'nature', thumbnail: natureForest, prompt: 'Place the product in a serene forest setting with dappled sunlight filtering through trees, natural and organic feel' },
  { id: 'garden', name: 'Garden Setting', category: 'nature', thumbnail: natureGarden, prompt: 'Place the product in a lush garden with colorful flowers and greenery, fresh spring atmosphere' },
  { id: 'mountain', name: 'Mountain View', category: 'nature', thumbnail: natureMountain, prompt: 'Place the product with majestic mountain landscape in the background, adventure and outdoor lifestyle' },

  // Urban
  { id: 'cafe', name: 'Coffee Shop', category: 'urban', thumbnail: urbanCafe, prompt: 'Place the product on a rustic coffee shop table with warm ambient lighting and bokeh background, urban lifestyle' },
  { id: 'street', name: 'Street Style', category: 'urban', thumbnail: urbanStreet, prompt: 'Place the product in an urban street setting with city architecture and natural daylight, streetwear aesthetic' },
  { id: 'rooftop', name: 'Rooftop View', category: 'urban', thumbnail: urbanRooftop, prompt: 'Place the product on a rooftop terrace with city skyline in the background, sophisticated urban setting' },
  { id: 'subway', name: 'Metro Station', category: 'urban', thumbnail: urbanSubway, prompt: 'Place the product in a modern metro station with clean lines and urban commuter atmosphere' },

  // Magazine
  { id: 'editorial', name: 'Editorial Setup', category: 'magazine', thumbnail: magazineEditorial, prompt: 'Place the product in a high-fashion editorial setup with dramatic lighting and artistic composition, magazine cover quality' },
  { id: 'fashion', name: 'Fashion Studio', category: 'magazine', thumbnail: magazineFashion, prompt: 'Place the product in a fashion photography studio with seamless background and professional studio lighting' },
  { id: 'minimal', name: 'Minimalist', category: 'magazine', thumbnail: magazineMinimal, prompt: 'Place the product in an ultra-minimalist setting with lots of negative space, clean Scandinavian aesthetic' },
  { id: 'vogue', name: 'Vogue Style', category: 'magazine', thumbnail: magazineVogue, prompt: 'Place the product in a luxurious Vogue-inspired setting with high-end aesthetic and dramatic fashion lighting' },

  // Seasonal
  { id: 'christmas', name: 'Christmas Scene', category: 'seasonal', thumbnail: seasonalChristmas, prompt: 'Place the product in a festive Christmas setting with decorated tree, warm lights, and cozy holiday atmosphere' },
  { id: 'summer', name: 'Summer Vibes', category: 'seasonal', thumbnail: seasonalSummer, prompt: 'Place the product in a bright summer setting with tropical vibes, sunshine, and vacation atmosphere' },
  { id: 'autumn', name: 'Autumn Leaves', category: 'seasonal', thumbnail: seasonalAutumn, prompt: 'Place the product surrounded by colorful autumn leaves with warm fall lighting and cozy seasonal feel' },
  { id: 'spring', name: 'Spring Garden', category: 'seasonal', thumbnail: seasonalSpring, prompt: 'Place the product in a fresh spring garden with blooming flowers, soft pastel colors, and new growth' }
];

export const getCategoryIcon = (category: BackgroundCategory): string => {
  return backgroundCategories[category].icon;
};

export const getPresetsByCategory = (category: BackgroundCategory): BackgroundPreset[] => {
  return backgroundPresets.filter(preset => preset.category === category);
};
