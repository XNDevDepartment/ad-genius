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
  thumbnail?: string;
  prompt?: string;
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
  // nature: { 
  //   labelKey: 'bulkBackground.categories.nature', 
  //   descriptionKey: 'Outdoor natural settings',
  //   icon: 'TreeDeciduous' 
  // },
  // urban: { 
  //   labelKey: 'bulkBackground.categories.urban', 
  //   descriptionKey: 'City & street scenes',
  //   icon: 'Building2' 
  // },
  // seasonal: { 
  //   labelKey: 'bulkBackground.categories.seasonal', 
  //   descriptionKey: 'Holiday & seasonal themes',
  //   icon: 'Snowflake' 
  // }
};

export const backgroundPresets: BackgroundPreset[] = [
  // Studio
  { 
    id: 'white-seamless', 
    name: 'White Seamless', 
    category: 'studio',
    prompt: 'Place the product on a clean white seamless paper studio background with soft even lighting, professional product photography style'
  },
  { 
    id: 'black-studio', 
    name: 'Black Studio', 
    category: 'studio',
    prompt: 'Place the product on a matte black studio background with dramatic rim lighting, high-end product photography'
  },
  { 
    id: 'gradient-gray', 
    name: 'Gray Gradient', 
    category: 'studio',
    prompt: 'Place the product on a smooth gray gradient backdrop fading from light to dark, professional catalog photography'
  },
  { 
    id: 'soft-pink', 
    name: 'Soft Pink', 
    category: 'studio',
    prompt: 'Place the product on a soft pastel pink backdrop with feminine aesthetic, beauty product photography style'
  },
  
  // Lifestyle
  { 
    id: 'living-room', 
    name: 'Modern Living Room', 
    category: 'lifestyle',
    prompt: 'Place the product in a modern minimalist living room setting with natural light from large windows, lifestyle product photography'
  },
  { 
    id: 'kitchen', 
    name: 'Bright Kitchen', 
    category: 'lifestyle',
    prompt: 'Place the product on a bright kitchen countertop with marble surface and natural daylight, home lifestyle photography'
  },
  { 
    id: 'bedroom', 
    name: 'Cozy Bedroom', 
    category: 'lifestyle',
    prompt: 'Place the product in a cozy bedroom setting with soft neutral bedding and warm ambient lighting'
  },
  { 
    id: 'home-office', 
    name: 'Home Office', 
    category: 'lifestyle',
    prompt: 'Place the product on a modern home office desk with plants and minimal decor, professional yet homey setting'
  },
  
  // Nature
  { 
    id: 'beach', 
    name: 'Beach Scene', 
    category: 'nature',
    prompt: 'Place the product on a sandy beach with ocean waves in the background, golden hour sunlight, vacation lifestyle'
  },
  { 
    id: 'forest', 
    name: 'Forest Path', 
    category: 'nature',
    prompt: 'Place the product in a serene forest setting with dappled sunlight filtering through trees, natural and organic feel'
  },
  { 
    id: 'garden', 
    name: 'Garden Setting', 
    category: 'nature',
    prompt: 'Place the product in a lush garden with colorful flowers and greenery, fresh spring atmosphere'
  },
  { 
    id: 'mountain', 
    name: 'Mountain View', 
    category: 'nature',
    prompt: 'Place the product with majestic mountain landscape in the background, adventure and outdoor lifestyle'
  },
  
  // Urban
  { 
    id: 'cafe', 
    name: 'Coffee Shop', 
    category: 'urban',
    prompt: 'Place the product on a rustic coffee shop table with warm ambient lighting and bokeh background, urban lifestyle'
  },
  { 
    id: 'street', 
    name: 'Street Style', 
    category: 'urban',
    prompt: 'Place the product in an urban street setting with city architecture and natural daylight, streetwear aesthetic'
  },
  { 
    id: 'rooftop', 
    name: 'Rooftop View', 
    category: 'urban',
    prompt: 'Place the product on a rooftop terrace with city skyline in the background, sophisticated urban setting'
  },
  { 
    id: 'subway', 
    name: 'Metro Station', 
    category: 'urban',
    prompt: 'Place the product in a modern metro station with clean lines and urban commuter atmosphere'
  },
  
  // Magazine
  { 
    id: 'editorial', 
    name: 'Editorial Setup', 
    category: 'magazine',
    prompt: 'Place the product in a high-fashion editorial setup with dramatic lighting and artistic composition, magazine cover quality'
  },
  { 
    id: 'fashion', 
    name: 'Fashion Studio', 
    category: 'magazine',
    prompt: 'Place the product in a fashion photography studio with seamless background and professional studio lighting'
  },
  { 
    id: 'minimal', 
    name: 'Minimalist', 
    category: 'magazine',
    prompt: 'Place the product in an ultra-minimalist setting with lots of negative space, clean Scandinavian aesthetic'
  },
  { 
    id: 'vogue', 
    name: 'Vogue Style', 
    category: 'magazine',
    prompt: 'Place the product in a luxurious Vogue-inspired setting with high-end aesthetic and dramatic fashion lighting'
  },
  
  // Seasonal
  { 
    id: 'christmas', 
    name: 'Christmas Scene', 
    category: 'seasonal',
    prompt: 'Place the product in a festive Christmas setting with decorated tree, warm lights, and cozy holiday atmosphere'
  },
  { 
    id: 'summer', 
    name: 'Summer Vibes', 
    category: 'seasonal',
    prompt: 'Place the product in a bright summer setting with tropical vibes, sunshine, and vacation atmosphere'
  },
  { 
    id: 'autumn', 
    name: 'Autumn Leaves', 
    category: 'seasonal',
    prompt: 'Place the product surrounded by colorful autumn leaves with warm fall lighting and cozy seasonal feel'
  },
  { 
    id: 'spring', 
    name: 'Spring Garden', 
    category: 'seasonal',
    prompt: 'Place the product in a fresh spring garden with blooming flowers, soft pastel colors, and new growth'
  }
];

export const getCategoryIcon = (category: BackgroundCategory): string => {
  return backgroundCategories[category].icon;
};

export const getPresetsByCategory = (category: BackgroundCategory): BackgroundPreset[] => {
  return backgroundPresets.filter(preset => preset.category === category);
};
