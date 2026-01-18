export interface OnboardingScenario {
  id: string;
  icon: string;
  nameKey: string;
  descriptionKey: string;
  prompt: string;
}

export const ONBOARDING_SCENARIOS: OnboardingScenario[] = [
  {
    id: 'street_style',
    icon: '🏙️',
    nameKey: 'onboarding.scenarios.streetStyle.name',
    descriptionKey: 'onboarding.scenarios.streetStyle.description',
    prompt: 'Professional UGC photo of a fashionable person walking confidently on a trendy urban street. The product is the focal point of their outfit. Natural daylight, candid street photography style, shallow depth of field on background.'
  },
  {
    id: 'coffee_shop',
    icon: '☕',
    nameKey: 'onboarding.scenarios.coffeeShop.name',
    descriptionKey: 'onboarding.scenarios.coffeeShop.description',
    prompt: 'Authentic lifestyle photo at a stylish minimalist coffee shop. Person naturally interacting with the product while enjoying their drink. Warm ambient lighting, Instagram-worthy aesthetic, cozy atmosphere.'
  },
  {
    id: 'fashion_studio',
    icon: '📸',
    nameKey: 'onboarding.scenarios.fashionStudio.name',
    descriptionKey: 'onboarding.scenarios.fashionStudio.description',
    prompt: 'Clean editorial fashion photography in a professional studio. Soft directional lighting, neutral background, focus on the product. Magazine-quality, high-fashion aesthetic.'
  },
  {
    id: 'beach_day',
    icon: '🏖️',
    nameKey: 'onboarding.scenarios.beachDay.name',
    descriptionKey: 'onboarding.scenarios.beachDay.description',
    prompt: 'Summer vacation lifestyle photo at a beautiful beach or resort. Golden hour lighting, relaxed and aspirational mood. Product featured naturally in the vacation setting.'
  },
  {
    id: 'night_out',
    icon: '🌃',
    nameKey: 'onboarding.scenarios.nightOut.name',
    descriptionKey: 'onboarding.scenarios.nightOut.description',
    prompt: 'Stylish evening photo in an urban setting with ambient city lights. Sophisticated night-out vibe, neon reflections, fashionable person showcasing the product.'
  },
  {
    id: 'fitness_active',
    icon: '🏃',
    nameKey: 'onboarding.scenarios.fitnessActive.name',
    descriptionKey: 'onboarding.scenarios.fitnessActive.description',
    prompt: 'Dynamic active lifestyle photo during workout or outdoor fitness activity. Energetic, healthy aesthetic, product integrated naturally into athletic wear or activity.'
  }
];

// Sample fashion products for users without images
export const SAMPLE_PRODUCTS = [
  {
    id: 'sneakers',
    labelKey: 'onboarding.samples.sneakers',
    // Using a publicly available fashion product image placeholder
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop'
  },
  {
    id: 'tshirt',
    labelKey: 'onboarding.samples.tshirt',
    url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop'
  },
  {
    id: 'bag',
    labelKey: 'onboarding.samples.bag',
    url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop'
  },
  {
    id: 'sunglasses',
    labelKey: 'onboarding.samples.sunglasses',
    url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop'
  }
];
