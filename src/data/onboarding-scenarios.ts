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
    url: 'https://dhqdamfisdbbcieqlpvt.supabase.co/storage/v1/object/sign/ugc-inputs/4e962775-cb55-4301-bc33-081eacb96c46/1766073238358-h2af3g.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZWNiNWY4Mi01ZDQyLTQ5YjEtYWFkOC1lZjNiZGQ0MWMwYWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1Z2MtaW5wdXRzLzRlOTYyNzc1LWNiNTUtNDMwMS1iYzMzLTA4MWVhY2I5NmM0Ni8xNzY2MDczMjM4MzU4LWgyYWYzZy5qcGVnIiwiaWF0IjoxNzY4NzY2MzMwLCJleHAiOjE3Njg3Njk5MzB9.pU4He-Vi9GnNTE0dVU72QwuJRgFPv-eeA7_9krkCqZE'
  },
  {
    id: 'tshirt',
    labelKey: 'onboarding.samples.tshirt',
    url: 'https://dhqdamfisdbbcieqlpvt.supabase.co/storage/v1/object/sign/ugc-inputs/4e962775-cb55-4301-bc33-081eacb96c46/1761851266246-jo4opc.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZWNiNWY4Mi01ZDQyLTQ5YjEtYWFkOC1lZjNiZGQ0MWMwYWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1Z2MtaW5wdXRzLzRlOTYyNzc1LWNiNTUtNDMwMS1iYzMzLTA4MWVhY2I5NmM0Ni8xNzYxODUxMjY2MjQ2LWpvNG9wYy5qcGVnIiwiaWF0IjoxNzY4NzY2MzYzLCJleHAiOjE3Njg3Njk5NjN9.4FApDugCoRA90SaOiQhBQG2jQY10f0YS9Gf1d7XtAXQ'
  },
  {
    id: 'bag',
    labelKey: 'onboarding.samples.bag',
    url: 'https://dhqdamfisdbbcieqlpvt.supabase.co/storage/v1/object/sign/ugc-inputs/4e962775-cb55-4301-bc33-081eacb96c46/imported-1761733757119-1setv3vwlzr.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZWNiNWY4Mi01ZDQyLTQ5YjEtYWFkOC1lZjNiZGQ0MWMwYWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1Z2MtaW5wdXRzLzRlOTYyNzc1LWNiNTUtNDMwMS1iYzMzLTA4MWVhY2I5NmM0Ni9pbXBvcnRlZC0xNzYxNzMzNzU3MTE5LTFzZXR2M3Z3bHpyLmpwZyIsImlhdCI6MTc2ODc2NjQwNSwiZXhwIjoxNzY4NzcwMDA1fQ.8bcgq-LpqPhNbZR-W-sdDd177O1US-POTgB9lSy-ZF8'
  },
  {
    id: 'accessories',
    labelKey: 'onboarding.samples.sunglasses',
    url: 'https://dhqdamfisdbbcieqlpvt.supabase.co/storage/v1/object/sign/ugc-inputs/4e962775-cb55-4301-bc33-081eacb96c46/1768766225338-6f82nd.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZWNiNWY4Mi01ZDQyLTQ5YjEtYWFkOC1lZjNiZGQ0MWMwYWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1Z2MtaW5wdXRzLzRlOTYyNzc1LWNiNTUtNDMwMS1iYzMzLTA4MWVhY2I5NmM0Ni8xNzY4NzY2MjI1MzM4LTZmODJuZC53ZWJwIiwiaWF0IjoxNzY4NzY2MjU5LCJleHAiOjE3Njg3Njk4NTl9.8qekfOtXETIhZalBZU0NjlbzhxLf4_VJpHNxdEnwVAo'
  }
];
