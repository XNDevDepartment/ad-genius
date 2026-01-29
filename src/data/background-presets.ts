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
  { id: 'white-seamless', name: 'White Seamless', category: 'studio' },
  { id: 'black-studio', name: 'Black Studio', category: 'studio' },
  { id: 'gradient-gray', name: 'Gray Gradient', category: 'studio' },
  { id: 'soft-pink', name: 'Soft Pink', category: 'studio' },
  
  // Lifestyle
  { id: 'living-room', name: 'Modern Living Room', category: 'lifestyle' },
  { id: 'kitchen', name: 'Bright Kitchen', category: 'lifestyle' },
  { id: 'bedroom', name: 'Cozy Bedroom', category: 'lifestyle' },
  { id: 'home-office', name: 'Home Office', category: 'lifestyle' },
  
  // Nature
  { id: 'beach', name: 'Beach Scene', category: 'nature' },
  { id: 'forest', name: 'Forest Path', category: 'nature' },
  { id: 'garden', name: 'Garden Setting', category: 'nature' },
  { id: 'mountain', name: 'Mountain View', category: 'nature' },
  
  // Urban
  { id: 'cafe', name: 'Coffee Shop', category: 'urban' },
  { id: 'street', name: 'Street Style', category: 'urban' },
  { id: 'rooftop', name: 'Rooftop View', category: 'urban' },
  { id: 'subway', name: 'Metro Station', category: 'urban' },
  
  // Magazine
  { id: 'editorial', name: 'Editorial Setup', category: 'magazine' },
  { id: 'fashion', name: 'Fashion Studio', category: 'magazine' },
  { id: 'minimal', name: 'Minimalist', category: 'magazine' },
  { id: 'vogue', name: 'Vogue Style', category: 'magazine' },
  
  // Seasonal
  { id: 'christmas', name: 'Christmas Scene', category: 'seasonal' },
  { id: 'summer', name: 'Summer Vibes', category: 'seasonal' },
  { id: 'autumn', name: 'Autumn Leaves', category: 'seasonal' },
  { id: 'spring', name: 'Spring Garden', category: 'seasonal' }
];

export const getCategoryIcon = (category: BackgroundCategory): string => {
  return backgroundCategories[category].icon;
};

export const getPresetsByCategory = (category: BackgroundCategory): BackgroundPreset[] => {
  return backgroundPresets.filter(preset => preset.category === category);
};
